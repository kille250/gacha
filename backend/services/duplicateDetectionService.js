/**
 * Duplicate Detection Service
 *
 * Handles duplicate character detection logic using fingerprints.
 * Provides configurable thresholds and detection modes.
 *
 * Supports:
 * - Image to Image comparison
 * - Video to Video comparison (frame-based)
 * - Cross-media comparison (Image to Video, Video to Image)
 */

const { Op } = require('sequelize');
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

// Feature flag for video duplicate detection
const ENABLE_VIDEO_DEDUP = process.env.ENABLE_VIDEO_DEDUP !== 'false';

// Thresholds for duplicate detection
const THRESHOLDS = {
  EXACT_MATCH: 0,           // Distance 0 = exact perceptual match
  NEAR_DUPLICATE: 5,        // Distance 1-5 = near duplicate (reject)
  SUSPICIOUS: 10,           // Distance 6-10 = suspicious (flag for review)
  DIFFERENT: 11,            // Distance 11+ = different images
  // Video-specific thresholds
  VIDEO_FRAME_MATCH: 8,     // Maximum distance for video frame matching
  VIDEO_MIN_RATIO: 0.5,     // Minimum ratio of matching frames (50%)
  CROSS_MEDIA_MATCH: 6      // Threshold for image-to-video matching
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
    where.id = { [Op.ne]: excludeId };
  }

  return Character.findOne({
    where,
    attributes: ['id', 'name', 'series', 'image', 'mediaType']
  });
}

/**
 * Find similar characters by perceptual hash (images only)
 *
 * @param {string} dHash - dHash to compare
 * @param {number} threshold - Maximum Hamming distance to consider (default: 10)
 * @param {number|null} excludeId - Character ID to exclude
 * @returns {Promise<Array<{id, name, series, distance, similarity}>>}
 */
async function findSimilarCharacters(dHash, threshold = THRESHOLDS.SUSPICIOUS, excludeId = null) {
  if (!dHash) return [];

  // Get all characters with dHash (images and animated images)
  const where = {
    dHash: { [Op.ne]: null },
    [Op.or]: [
      { mediaType: 'image' },
      { mediaType: 'animated_image' },
      { mediaType: null }  // Legacy characters without mediaType
    ]
  };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const characters = await Character.findAll({
    where,
    attributes: ['id', 'name', 'series', 'image', 'dHash', 'mediaType']
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
        mediaType: char.mediaType || 'image',
        distance,
        similarity: distanceToSimilarity(distance),
        matchType: 'image'
      });
    }
  }

  // Sort by distance (closest first)
  return matches.sort((a, b) => a.distance - b.distance);
}

/**
 * Find similar videos by comparing frame hashes
 *
 * @param {Array<{dHash: string}>} frameHashes - Array of frame hashes from new video
 * @param {number} threshold - Maximum Hamming distance for frame matching (default: 8)
 * @param {number|null} excludeId - Character ID to exclude
 * @returns {Promise<Array<{id, name, series, matchRatio, similarity}>>}
 */
async function findSimilarVideos(frameHashes, threshold = THRESHOLDS.VIDEO_FRAME_MATCH, excludeId = null) {
  if (!frameHashes || frameHashes.length === 0) return [];

  // Get all video characters with frame hashes
  const where = {
    mediaType: 'video',
    frameHashes: { [Op.ne]: null }
  };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const videoCharacters = await Character.findAll({
    where,
    attributes: ['id', 'name', 'series', 'image', 'frameHashes', 'frameCount']
  });

  const matches = [];
  for (const char of videoCharacters) {
    const existingHashes = char.frameHashes;
    if (!existingHashes || !Array.isArray(existingHashes)) continue;

    // Count matching frames
    let matchingFrames = 0;
    for (const h1 of frameHashes) {
      for (const h2 of existingHashes) {
        const distance = hammingDistance(h1.dHash, h2.dHash);
        if (distance <= threshold) {
          matchingFrames++;
          break; // Count each frame from input only once
        }
      }
    }

    const minFrames = Math.min(frameHashes.length, existingHashes.length);
    const matchRatio = minFrames > 0 ? matchingFrames / minFrames : 0;

    if (matchRatio >= THRESHOLDS.VIDEO_MIN_RATIO) {
      matches.push({
        id: char.id,
        name: char.name,
        series: char.series,
        image: char.image,
        mediaType: 'video',
        matchRatio,
        matchingFrames,
        totalFrames: minFrames,
        similarity: Math.round(matchRatio * 100),
        matchType: 'video'
      });
    }
  }

  return matches.sort((a, b) => b.matchRatio - a.matchRatio);
}

/**
 * Find videos that contain a similar frame to the given image
 *
 * @param {string} imageDHash - dHash of the image to search for
 * @param {number} threshold - Maximum Hamming distance (default: 6)
 * @param {number|null} excludeId - Character ID to exclude
 * @returns {Promise<Array<{id, name, series, distance, matchType}>>}
 */
async function findImageInVideos(imageDHash, threshold = THRESHOLDS.CROSS_MEDIA_MATCH, excludeId = null) {
  if (!imageDHash) return [];

  // Get all video characters
  const where = {
    mediaType: 'video',
    [Op.or]: [
      { representativeDHash: { [Op.ne]: null } },
      { frameHashes: { [Op.ne]: null } }
    ]
  };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const videoCharacters = await Character.findAll({
    where,
    attributes: ['id', 'name', 'series', 'image', 'frameHashes', 'representativeDHash']
  });

  const matches = [];
  for (const char of videoCharacters) {
    // Quick check: representative hash
    if (char.representativeDHash) {
      const repDistance = hammingDistance(imageDHash, char.representativeDHash);
      if (repDistance <= threshold) {
        matches.push({
          id: char.id,
          name: char.name,
          series: char.series,
          image: char.image,
          mediaType: 'video',
          distance: repDistance,
          similarity: distanceToSimilarity(repDistance),
          matchType: 'representative_frame'
        });
        continue;
      }
    }

    // Thorough check: all frames
    const frameHashes = char.frameHashes;
    if (frameHashes && Array.isArray(frameHashes)) {
      for (const frame of frameHashes) {
        const distance = hammingDistance(imageDHash, frame.dHash);
        if (distance <= threshold) {
          matches.push({
            id: char.id,
            name: char.name,
            series: char.series,
            image: char.image,
            mediaType: 'video',
            distance,
            similarity: distanceToSimilarity(distance),
            matchType: 'frame_match',
            frameIndex: frame.frameIndex
          });
          break; // One match is enough
        }
      }
    }
  }

  return matches.sort((a, b) => a.distance - b.distance);
}

/**
 * Find images that match a video's representative frame
 *
 * @param {string} representativeDHash - dHash of video's representative frame
 * @param {number} threshold - Maximum Hamming distance (default: 6)
 * @param {number|null} excludeId - Character ID to exclude
 * @returns {Promise<Array<{id, name, series, distance, matchType}>>}
 */
async function findVideoInImages(representativeDHash, threshold = THRESHOLDS.CROSS_MEDIA_MATCH, excludeId = null) {
  if (!representativeDHash) return [];

  // Get all image characters
  const where = {
    dHash: { [Op.ne]: null },
    [Op.or]: [
      { mediaType: 'image' },
      { mediaType: 'animated_image' },
      { mediaType: null }
    ]
  };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const imageCharacters = await Character.findAll({
    where,
    attributes: ['id', 'name', 'series', 'image', 'dHash', 'mediaType']
  });

  const matches = [];
  for (const char of imageCharacters) {
    const distance = hammingDistance(representativeDHash, char.dHash);
    if (distance <= threshold) {
      matches.push({
        id: char.id,
        name: char.name,
        series: char.series,
        image: char.image,
        mediaType: char.mediaType || 'image',
        distance,
        similarity: distanceToSimilarity(distance),
        matchType: 'video_to_image'
      });
    }
  }

  return matches.sort((a, b) => a.distance - b.distance);
}

/**
 * Check for duplicates and return detection result
 *
 * @param {string} filePath - Path to uploaded file
 * @param {number|null} excludeId - Character ID to exclude (for updates)
 * @returns {Promise<{
 *   fingerprints: Object,
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
    // Could not process media - allow but warn
    result.action = 'warn';
    result.reason = 'Could not generate media fingerprints';
    return result;
  }

  const isVideo = result.fingerprints.mediaType === 'video';

  // Check for exact duplicate (SHA-256)
  const exactMatch = await findExactDuplicate(result.fingerprints.sha256, excludeId);
  if (exactMatch) {
    result.isExactDuplicate = true;
    result.exactMatch = exactMatch;
    result.action = DETECTION_MODE === 'block' ? 'reject' : 'warn';
    result.reason = 'Exact duplicate detected (identical file)';
    return result;
  }

  // Video-specific duplicate detection
  if (isVideo && ENABLE_VIDEO_DEDUP && result.fingerprints.frameHashes) {
    // Check for similar videos
    const videoMatches = await findSimilarVideos(
      result.fingerprints.frameHashes,
      THRESHOLDS.VIDEO_FRAME_MATCH,
      excludeId
    );

    if (videoMatches.length > 0) {
      result.similarMatches = videoMatches;
      result.action = DETECTION_MODE === 'block' ? 'reject' : 'warn';
      result.reason = `Similar video detected (${videoMatches[0].similarity}% frame match with "${videoMatches[0].name}")`;
      return result;
    }

    // Check if video matches existing images (cross-media)
    if (result.fingerprints.representativeDHash) {
      const crossMatches = await findVideoInImages(
        result.fingerprints.representativeDHash,
        THRESHOLDS.CROSS_MEDIA_MATCH,
        excludeId
      );

      if (crossMatches.length > 0) {
        result.similarMatches = crossMatches;
        result.action = 'flag'; // Always flag, never auto-reject cross-media
        result.reason = `Video may be animation of existing image "${crossMatches[0].name}" (${crossMatches[0].similarity}% similar)`;
        return result;
      }
    }
  }

  // Image-specific duplicate detection
  if (!isVideo) {
    // Check for perceptual duplicates (dHash) - images only
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

    // Cross-media check: image against video library
    if (ENABLE_VIDEO_DEDUP) {
      const crossMatches = await findImageInVideos(
        result.fingerprints.dHash,
        THRESHOLDS.CROSS_MEDIA_MATCH,
        excludeId
      );

      if (crossMatches.length > 0) {
        result.similarMatches = crossMatches;
        result.action = 'flag'; // Always flag, never auto-reject cross-media
        result.reason = `Image may be a frame from existing video "${crossMatches[0].name}" (${crossMatches[0].similarity}% similar)`;
        return result;
      }
    }
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

/**
 * Check if video duplicate detection is enabled
 * @returns {boolean}
 */
function isVideoDeduplicationEnabled() {
  return ENABLE_VIDEO_DEDUP;
}

module.exports = {
  checkForDuplicates,
  findExactDuplicate,
  findSimilarCharacters,
  findSimilarVideos,
  findImageInVideos,
  findVideoInImages,
  getDetectionMode,
  getThresholds,
  isVideoDeduplicationEnabled,
  THRESHOLDS
};
