/**
 * Duplicate Detection Service
 *
 * Handles duplicate character detection logic using fingerprints.
 * Provides configurable thresholds and detection modes.
 */

const { Character } = require('../models');
const {
  generateFingerprints,
  hammingDistance,
  distanceToSimilarity
} = require('./imageFingerprintService');

// Detection mode from environment
// 'disabled' - No checking
// 'warn' - Log warnings but allow duplicates
// 'block' - Reject duplicates
const DETECTION_MODE = process.env.DUPLICATE_DETECTION_MODE || 'warn';

// Thresholds for duplicate detection
const THRESHOLDS = {
  EXACT_MATCH: 0,      // Distance 0 = exact perceptual match
  NEAR_DUPLICATE: 5,   // Distance 1-5 = near duplicate (reject)
  SUSPICIOUS: 10,      // Distance 6-10 = suspicious (flag for review)
  DIFFERENT: 11        // Distance 11+ = different images
};

/**
 * Find exact duplicate by SHA-256 hash
 *
 * @param {string} sha256Hash - Hash to check
 * @param {number|null} excludeId - Character ID to exclude (for updates)
 * @returns {Promise<Object|null>} Matching character or null
 */
async function findExactDuplicate(sha256Hash, excludeId = null) {
  if (!sha256Hash) return null;

  const where = { sha256Hash };
  if (excludeId) {
    where.id = { [require('sequelize').Op.ne]: excludeId };
  }

  return Character.findOne({
    where,
    attributes: ['id', 'name', 'series', 'image']
  });
}

/**
 * Find similar characters by perceptual hash
 *
 * @param {string} dHash - dHash to compare
 * @param {number} threshold - Maximum Hamming distance to consider (default: 10)
 * @param {number|null} excludeId - Character ID to exclude
 * @returns {Promise<Array<{id, name, series, distance, similarity}>>}
 */
async function findSimilarCharacters(dHash, threshold = THRESHOLDS.SUSPICIOUS, excludeId = null) {
  if (!dHash) return [];

  // Get all characters with dHash
  const where = { dHash: { [require('sequelize').Op.ne]: null } };
  if (excludeId) {
    where.id = { [require('sequelize').Op.ne]: excludeId };
  }

  const characters = await Character.findAll({
    where,
    attributes: ['id', 'name', 'series', 'image', 'dHash']
  });

  // Calculate distances and filter
  const matches = [];
  for (const char of characters) {
    const distance = hammingDistance(dHash, char.dHash);
    if (distance <= threshold) {
      matches.push({
        id: char.id,
        name: char.name,
        series: char.series,
        image: char.image,
        distance,
        similarity: distanceToSimilarity(distance)
      });
    }
  }

  // Sort by distance (closest first)
  return matches.sort((a, b) => a.distance - b.distance);
}

/**
 * Check for duplicates and return detection result
 *
 * @param {string} filePath - Path to uploaded file
 * @param {number|null} excludeId - Character ID to exclude (for updates)
 * @returns {Promise<{
 *   fingerprints: {sha256, dHash, aHash},
 *   isExactDuplicate: boolean,
 *   exactMatch: Object|null,
 *   similarMatches: Array,
 *   action: 'accept'|'reject'|'flag'|'warn',
 *   reason: string|null
 * }>}
 */
async function checkForDuplicates(filePath, excludeId = null) {
  const result = {
    fingerprints: null,
    isExactDuplicate: false,
    exactMatch: null,
    similarMatches: [],
    action: 'accept',
    reason: null
  };

  // Skip if detection is disabled
  if (DETECTION_MODE === 'disabled') {
    // Still generate fingerprints for storage
    result.fingerprints = await generateFingerprints(filePath);
    return result;
  }

  // Generate fingerprints
  result.fingerprints = await generateFingerprints(filePath);

  if (!result.fingerprints) {
    // Could not process image - allow but warn
    result.action = 'warn';
    result.reason = 'Could not generate image fingerprints';
    return result;
  }

  // Check for exact duplicate (SHA-256)
  const exactMatch = await findExactDuplicate(result.fingerprints.sha256, excludeId);
  if (exactMatch) {
    result.isExactDuplicate = true;
    result.exactMatch = exactMatch;
    result.action = DETECTION_MODE === 'block' ? 'reject' : 'warn';
    result.reason = 'Exact duplicate detected (identical file)';
    return result;
  }

  // Check for perceptual duplicates (dHash)
  const nearDuplicates = await findSimilarCharacters(
    result.fingerprints.dHash,
    THRESHOLDS.NEAR_DUPLICATE,
    excludeId
  );

  if (nearDuplicates.length > 0) {
    result.similarMatches = nearDuplicates;
    result.action = DETECTION_MODE === 'block' ? 'reject' : 'warn';
    result.reason = `Near-duplicate detected (${nearDuplicates[0].similarity}% similar to "${nearDuplicates[0].name}")`;
    return result;
  }

  // Check for suspicious similarity
  const suspiciousMatches = await findSimilarCharacters(
    result.fingerprints.dHash,
    THRESHOLDS.SUSPICIOUS,
    excludeId
  );

  if (suspiciousMatches.length > 0) {
    result.similarMatches = suspiciousMatches;
    result.action = 'flag';
    result.reason = `Possible duplicate (${suspiciousMatches[0].similarity}% similar to "${suspiciousMatches[0].name}")`;
    return result;
  }

  return result;
}

/**
 * Get current detection mode
 * @returns {string}
 */
function getDetectionMode() {
  return DETECTION_MODE;
}

/**
 * Get threshold configuration
 * @returns {Object}
 */
function getThresholds() {
  return { ...THRESHOLDS };
}

module.exports = {
  checkForDuplicates,
  findExactDuplicate,
  findSimilarCharacters,
  getDetectionMode,
  getThresholds,
  THRESHOLDS
};
