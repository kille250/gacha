/**
 * Import Job Service
 *
 * Handles background processing of character imports.
 * Uses database-backed job queue for reliability.
 */

const ImportJob = require('../models/importJob');
const { Character } = require('../models');
const { getUrlPath, getFilePath } = require('../config/upload');
const { downloadImage, generateUniqueFilename, getExtensionFromUrl, safeUnlink } = require('../utils/fileUtils');
const { checkForDuplicates, getDetectionMode } = require('./duplicateDetectionService');
const { logAdminAction } = require('./auditService');
const { calculateRarity, getRarityDetails } = require('../utils/rarityCalculator');

// Jikan API configuration (same as animeImport.js)
const JIKAN_API = 'https://api.jikan.moe/v4';
const MIN_REQUEST_INTERVAL = 500;
const MAX_RETRIES = 3;

// Track last request time for rate limiting
let lastRequestTime = 0;

// Processing lock to prevent concurrent job processing
let isProcessing = false;

/**
 * Rate-limited fetch for Jikan API
 */
const rateLimitedFetch = async (url, retryCount = 0) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();

  const response = await fetch(url);

  if (response.status === 429) {
    if (retryCount < MAX_RETRIES) {
      const backoffTime = Math.pow(2, retryCount + 1) * 1000;
      console.log(`[ImportJob] Rate limited, waiting ${backoffTime}ms before retry ${retryCount + 1}/${MAX_RETRIES}`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return rateLimitedFetch(url, retryCount + 1);
    }
    throw new Error('Rate limited by MAL API after multiple retries');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }
  return response.json();
};

/**
 * Process a single character import
 */
async function processCharacter(char, series, defaultRarity, autoRarity, detectionMode, adminId) {
  if (!char.name || !char.image) {
    return { success: false, error: { name: char.name || 'Unknown', error: 'Missing name or image' } };
  }

  // Determine rarity
  let characterRarity = char.rarity || defaultRarity;
  let rarityDetails = null;

  if (autoRarity && char.mal_id) {
    try {
      const characterUrl = `${JIKAN_API}/characters/${char.mal_id}/full`;
      const charData = await rateLimitedFetch(characterUrl);
      const favorites = charData.data?.favorites || 0;
      const role = char.role || null;

      characterRarity = calculateRarity(favorites, role);
      rarityDetails = getRarityDetails(favorites, role);

      console.log(`[ImportJob] Auto-rarity for "${char.name}": ${favorites} favorites, role=${role} -> ${characterRarity}`);
    } catch (fetchErr) {
      console.warn(`[ImportJob] Could not fetch favorites for ${char.name}, using default rarity:`, fetchErr.message);
    }
  } else if (autoRarity && char.favorites !== undefined) {
    characterRarity = calculateRarity(char.favorites, char.role);
    rarityDetails = getRarityDetails(char.favorites, char.role);
  }

  // Download image
  const ext = getExtensionFromUrl(char.image);
  const filename = generateUniqueFilename('imported', ext);

  await downloadImage(char.image, filename, 'characters', { minFileSize: 1000 });
  const filePath = getFilePath('characters', filename);
  const imagePath = getUrlPath('characters', filename);

  // Check for duplicates
  const duplicateCheck = await checkForDuplicates(filePath);

  if (duplicateCheck.action === 'reject') {
    safeUnlink(filePath);
    return {
      success: false,
      error: {
        name: char.name,
        error: duplicateCheck.reason,
        duplicateOf: duplicateCheck.exactMatch?.name || duplicateCheck.similarMatches[0]?.name
      }
    };
  }

  // Log warnings
  if (duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag') {
    await logAdminAction('character.duplicate_warning', adminId, null, {
      action: duplicateCheck.action,
      reason: duplicateCheck.reason,
      matches: duplicateCheck.similarMatches,
      filename: filename,
      detectionMode,
      importSource: 'background-import'
    });
  }

  // Create character
  const fp = duplicateCheck.fingerprints;
  const newCharacter = await Character.create({
    name: char.name,
    image: imagePath,
    series: series.trim(),
    rarity: characterRarity,
    isR18: false,
    sha256Hash: fp?.sha256 || null,
    dHash: fp?.dHash || null,
    aHash: fp?.aHash || null,
    duplicateWarning: duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag',
    mediaType: fp?.mediaType || 'image',
    frameHashes: fp?.frameHashes || null,
    representativeDHash: fp?.representativeDHash || null,
    representativeAHash: fp?.representativeAHash || null,
    duration: fp?.duration || null,
    frameCount: fp?.frameCount || null
  });

  const charResponse = newCharacter.toJSON();
  if (rarityDetails) {
    charResponse.rarityCalculation = rarityDetails;
  }

  return { success: true, character: charResponse };
}

/**
 * Process a single import job
 */
async function processJob(job) {
  console.log(`[ImportJob] Starting job ${job.id} for series "${job.series}" (${job.totalCharacters} characters, autoRarity=${job.autoRarity})`);

  try {
    await job.markProcessing();
    const detectionMode = getDetectionMode();
    const characters = job.charactersData;

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];

      try {
        const result = await processCharacter(
          char,
          job.series,
          job.defaultRarity,
          job.autoRarity,
          detectionMode,
          job.createdBy
        );

        if (result.success) {
          await job.addCreatedCharacter(result.character);
        } else {
          await job.addError(result.error);
        }

        // Small delay between characters to avoid overwhelming services
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (charErr) {
        console.error(`[ImportJob] Error processing character ${char.name}:`, charErr);
        await job.addError({ name: char.name, error: charErr.message });
      }

      // Log progress periodically
      if ((i + 1) % 10 === 0 || i === characters.length - 1) {
        console.log(`[ImportJob] Job ${job.id} progress: ${i + 1}/${characters.length}`);
      }
    }

    await job.markCompleted();
    console.log(`[ImportJob] Job ${job.id} completed: ${job.successCount} created, ${job.errorCount} errors`);

  } catch (err) {
    console.error(`[ImportJob] Job ${job.id} failed:`, err);
    await job.markFailed(err.message);
  }
}

/**
 * Process pending jobs (called periodically)
 */
async function processPendingJobs() {
  // Prevent concurrent processing
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    const pendingJobs = await ImportJob.getPendingJobs(1);

    if (pendingJobs.length === 0) {
      return;
    }

    for (const job of pendingJobs) {
      await processJob(job);
    }
  } catch (err) {
    console.error('[ImportJob] Error processing pending jobs:', err);
  } finally {
    isProcessing = false;
  }
}

/**
 * Create a new import job
 */
async function createImportJob(adminId, { characters, series, defaultRarity, autoRarity }) {
  const job = await ImportJob.createJob(adminId, {
    characters,
    series,
    defaultRarity,
    autoRarity
  });

  console.log(`[ImportJob] Created job ${job.id} for ${characters.length} characters`);

  // Start processing immediately in background (don't await)
  setImmediate(() => processPendingJobs());

  return job;
}

/**
 * Get job status
 */
async function getJobStatus(jobId, userId) {
  const job = await ImportJob.getJobForUser(jobId, userId);
  return job ? job.toStatusResponse() : null;
}

/**
 * Cancel a pending job
 */
async function cancelJob(jobId, userId) {
  const job = await ImportJob.getJobForUser(jobId, userId);

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (job.status !== 'pending') {
    return { success: false, error: 'Can only cancel pending jobs' };
  }

  job.status = 'cancelled';
  job.completedAt = new Date();
  await job.save();

  return { success: true };
}

/**
 * Get recent jobs for an admin
 */
async function getRecentJobs(userId, limit = 10) {
  const jobs = await ImportJob.findAll({
    where: { createdBy: userId },
    order: [['createdAt', 'DESC']],
    limit
  });

  return jobs.map(job => job.toStatusResponse());
}

/**
 * Cleanup old completed jobs
 */
async function cleanupOldJobs() {
  const deleted = await ImportJob.cleanupOldJobs(24);
  if (deleted > 0) {
    console.log(`[ImportJob] Cleaned up ${deleted} old jobs`);
  }
  return deleted;
}

module.exports = {
  createImportJob,
  getJobStatus,
  cancelJob,
  getRecentJobs,
  processPendingJobs,
  cleanupOldJobs
};
