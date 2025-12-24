#!/usr/bin/env node
/**
 * Backfill Video Fingerprints Script
 *
 * Generates video fingerprints (frame hashes, representative hashes) for existing
 * video characters that don't have them yet, or updates existing characters
 * with the new mediaType field.
 *
 * Usage:
 *   node scripts/backfillVideoFingerprints.js [options]
 *
 * Options:
 *   --batch-size=N    Process N characters at a time (default: 50)
 *   --dry-run         Show what would be done without making changes
 *   --force           Regenerate fingerprints for ALL characters
 *   --videos-only     Only process video files (skip images)
 *   --update-types    Only update mediaType field for existing characters
 *   --detect-videos   Find and fix video files incorrectly labeled as images
 *
 * Examples:
 *   npm run backfill:video:dry              # Preview what would be processed
 *   npm run backfill:video                  # Process characters needing updates
 *   npm run backfill:video -- --force       # Reprocess ALL characters
 *   npm run backfill:video -- --detect-videos  # Fix misclassified videos
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Character } = require('../models');
const { getFilePath } = require('../config/upload');
const { generateFingerprints } = require('../services/imageFingerprintService');
const { isVideoFile, VIDEO_EXTENSIONS } = require('../services/videoFingerprintService');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  batchSize: 50,
  dryRun: false,
  force: false,
  videosOnly: false,
  updateTypes: false,
  detectVideos: false
};

for (const arg of args) {
  if (arg.startsWith('--batch-size=')) {
    options.batchSize = parseInt(arg.split('=')[1], 10) || 50;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--force') {
    options.force = true;
  } else if (arg === '--videos-only') {
    options.videosOnly = true;
  } else if (arg === '--update-types') {
    options.updateTypes = true;
  } else if (arg === '--detect-videos') {
    options.detectVideos = true;
  }
}

/**
 * Determine media type from file extension
 */
function getMediaTypeFromPath(imagePath) {
  if (!imagePath) return 'image';
  const ext = path.extname(imagePath).toLowerCase();
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (['.gif', '.webp'].includes(ext)) return 'animated_image'; // May be animated
  return 'image';
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

async function backfillVideoFingerprints() {
  console.log('='.repeat(60));
  console.log('Video Fingerprint Backfill Script');
  console.log('='.repeat(60));
  console.log(`Options: batchSize=${options.batchSize}, dryRun=${options.dryRun}, force=${options.force}, videosOnly=${options.videosOnly}, updateTypes=${options.updateTypes}, detectVideos=${options.detectVideos}`);
  console.log('');

  // Check if ffmpeg is available
  try {
    const { checkFfmpegAvailable } = require('../services/videoFingerprintService');
    const ffmpegAvailable = await checkFfmpegAvailable();
    if (!ffmpegAvailable) {
      console.warn('WARNING: ffmpeg is not available. Video fingerprints will not be generated.');
      console.warn('Install ffmpeg to enable video fingerprinting.');
      if (!options.updateTypes) {
        console.log('Use --update-types to only update mediaType fields without video processing.');
        return;
      }
    } else {
      console.log('ffmpeg is available.');
    }
  } catch (err) {
    console.warn('WARNING: Could not check ffmpeg availability:', err.message);
  }

  // Build query for characters needing processing
  let where = {};
  const Op = require('sequelize').Op;

  // Video file extension patterns for detecting misclassified videos
  const videoExtensionPatterns = [
    { [Op.like]: '%.mp4' },
    { [Op.like]: '%.webm' },
    { [Op.like]: '%.mov' },
    { [Op.like]: '%.avi' },
    { [Op.like]: '%.mkv' }
  ];

  if (options.detectVideos) {
    // Only find video files that are incorrectly labeled as images
    where = {
      [Op.or]: [
        { mediaType: 'image' },
        { mediaType: null }
      ],
      image: { [Op.or]: videoExtensionPatterns }
    };
    console.log('Mode: Detecting misclassified video files...');
  } else if (options.updateTypes) {
    // Only update mediaType for characters that don't have it
    where.mediaType = null;
  } else if (options.videosOnly) {
    // Only process videos without frame hashes
    where = {
      frameHashes: null,
      mediaType: 'video'
    };
  } else if (!options.force) {
    // Process characters that:
    // 1. Have no mediaType set, OR
    // 2. Are videos without frame hashes, OR
    // 3. Have video file extensions but mediaType is 'image' (incorrectly classified)
    where = {
      [Op.or]: [
        { mediaType: null },
        {
          mediaType: 'video',
          frameHashes: null
        },
        // Catch video files that were set to 'image' by the migration
        {
          [Op.or]: [
            { mediaType: 'image' },
            { mediaType: null }
          ],
          image: { [Op.or]: videoExtensionPatterns }
        }
      ]
    };
  }

  // Get total count
  const totalCount = await Character.count({ where: options.force ? {} : where });
  console.log(`Found ${totalCount} characters to process`);

  if (totalCount === 0) {
    console.log('No characters need processing. Done!');
    return;
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let videosProcessed = 0;
  let imagesProcessed = 0;

  // Process in batches
  while (processed < totalCount) {
    const characters = await Character.findAll({
      where: options.force ? {} : where,
      limit: options.batchSize,
      offset: processed,
      order: [['id', 'ASC']]
    });

    if (characters.length === 0) break;

    console.log(`\nProcessing batch ${Math.floor(processed / options.batchSize) + 1} (${characters.length} characters)...`);

    for (const char of characters) {
      processed++;
      const progress = `[${processed}/${totalCount}]`;

      // Get file path from image URL
      if (!char.image || !char.image.startsWith('/uploads/')) {
        console.log(`${progress} SKIP: ${char.id} "${char.name}" - External URL or missing image`);
        skipped++;
        continue;
      }

      const filename = path.basename(char.image);
      // Determine directory based on file type
      const isVideo = isVideoFile(char.image);
      const directory = isVideo ? 'videos' : 'characters';
      let filePath = getFilePath(directory, filename);

      // If not found in expected directory, try the other
      if (!fileExists(filePath)) {
        const altDirectory = isVideo ? 'characters' : 'videos';
        const altPath = getFilePath(altDirectory, filename);
        if (fileExists(altPath)) {
          filePath = altPath;
        }
      }

      // Check if file exists
      if (!fileExists(filePath)) {
        console.log(`${progress} SKIP: ${char.id} "${char.name}" - File not found: ${filename}`);
        skipped++;
        continue;
      }

      const detectedMediaType = getMediaTypeFromPath(char.image);

      // If only updating types, just set mediaType
      if (options.updateTypes) {
        if (options.dryRun) {
          console.log(`${progress} DRY-RUN: ${char.id} "${char.name}" -> mediaType=${detectedMediaType}`);
        } else {
          await char.update({ mediaType: detectedMediaType });
          console.log(`${progress} OK: ${char.id} "${char.name}" -> mediaType=${detectedMediaType}`);
        }
        succeeded++;
        continue;
      }

      // Skip images if videos-only mode
      if (options.videosOnly && !isVideo) {
        console.log(`${progress} SKIP: ${char.id} "${char.name}" - Not a video file`);
        skipped++;
        continue;
      }

      try {
        // Generate fingerprints
        const fingerprints = await generateFingerprints(filePath);

        if (!fingerprints) {
          console.log(`${progress} FAIL: ${char.id} "${char.name}" - Fingerprint generation returned null`);
          failed++;
          continue;
        }

        if (options.dryRun) {
          const info = fingerprints.mediaType === 'video'
            ? `mediaType=${fingerprints.mediaType}, frames=${fingerprints.frameCount}, duration=${fingerprints.duration?.toFixed(1)}s`
            : `mediaType=${fingerprints.mediaType}, dHash=${fingerprints.dHash}`;
          console.log(`${progress} DRY-RUN: ${char.id} "${char.name}" -> ${info}`);
          succeeded++;
          if (fingerprints.mediaType === 'video') videosProcessed++;
          else imagesProcessed++;
        } else {
          // Build update object
          const updateData = {
            sha256Hash: fingerprints.sha256,
            dHash: fingerprints.dHash,
            aHash: fingerprints.aHash,
            mediaType: fingerprints.mediaType || detectedMediaType
          };

          // Add video-specific fields
          if (fingerprints.mediaType === 'video') {
            updateData.frameHashes = fingerprints.frameHashes;
            updateData.representativeDHash = fingerprints.representativeDHash;
            updateData.representativeAHash = fingerprints.representativeAHash;
            updateData.duration = fingerprints.duration;
            updateData.frameCount = fingerprints.frameCount;
          }

          await char.update(updateData);

          const info = fingerprints.mediaType === 'video'
            ? `frames=${fingerprints.frameCount}, duration=${fingerprints.duration?.toFixed(1)}s`
            : `dHash=${fingerprints.dHash}`;
          console.log(`${progress} OK: ${char.id} "${char.name}" [${fingerprints.mediaType}] -> ${info}`);

          succeeded++;
          if (fingerprints.mediaType === 'video') videosProcessed++;
          else imagesProcessed++;
        }
      } catch (err) {
        console.log(`${progress} FAIL: ${char.id} "${char.name}" - ${err.message}`);
        failed++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${processed}`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`    - Videos: ${videosProcessed}`);
  console.log(`    - Images: ${imagesProcessed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  if (options.dryRun) {
    console.log('\n(Dry run - no changes were made)');
  }
  console.log('');
}

// Run the script
backfillVideoFingerprints()
  .then(() => {
    console.log('Backfill complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
