/**
 * Video Fingerprint Service
 *
 * Extracts frames from videos and generates perceptual hashes
 * to enable duplicate and near-duplicate detection for video content.
 *
 * Supports:
 * - Frame extraction at uniform intervals
 * - Per-frame dHash and aHash generation
 * - Representative frame selection for cross-media comparison
 * - SHA-256 for exact video file matching
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');

// Import image fingerprint functions for per-frame hashing
const { computeDHash, computeAHash } = require('./imageFingerprintService');

// Video processing configuration
const CONFIG = {
  MAX_FRAMES: 8,              // Maximum frames to extract
  MIN_FRAMES: 2,              // Minimum frames required
  MAX_DURATION: 30,           // Maximum video duration in seconds
  MIN_RESOLUTION: 64,         // Minimum width/height
  FRAME_FORMAT: 'png',        // Output format for extracted frames
  REPRESENTATIVE_POSITION: 0.25  // Position for representative frame (25%)
};

// Supported video extensions
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

/**
 * Check if a file is a video based on extension
 * @param {string} filePath - Path to file
 * @returns {boolean}
 */
function isVideoFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const ext = path.extname(filePath).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Get video metadata using ffprobe
 * @param {string} videoPath - Path to video file
 * @returns {Promise<{duration: number, width: number, height: number, fps: number, codec: string}>}
 */
function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe video: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      // Parse frame rate (can be "30/1" or "29.97")
      let fps = 24;
      if (videoStream.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split('/');
        fps = parts.length === 2 ? parseInt(parts[0]) / parseInt(parts[1]) : parseFloat(parts[0]);
      }

      resolve({
        duration: parseFloat(metadata.format.duration) || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: fps || 24,
        codec: videoStream.codec_name || 'unknown',
        frameCount: parseInt(videoStream.nb_frames) || Math.floor((metadata.format.duration || 0) * fps)
      });
    });
  });
}

/**
 * Extract a single frame from video at specified timestamp
 * @param {string} videoPath - Path to video file
 * @param {number} timestamp - Timestamp in seconds
 * @param {string} outputPath - Path to save extracted frame
 * @returns {Promise<Buffer>}
 */
function extractFrameAt(videoPath, timestamp, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .frames(1)
      .outputOptions(['-f', 'image2'])
      .output(outputPath)
      .on('end', async () => {
        try {
          const buffer = await fs.readFile(outputPath);
          // Clean up temp file
          await fs.unlink(outputPath).catch(() => {});
          resolve(buffer);
        } catch (readErr) {
          reject(new Error(`Failed to read extracted frame: ${readErr.message}`));
        }
      })
      .on('error', (err) => {
        reject(new Error(`Failed to extract frame at ${timestamp}s: ${err.message}`));
      })
      .run();
  });
}

/**
 * Extract multiple frames from video at uniform intervals
 * @param {string} videoPath - Path to video file
 * @param {number} maxFrames - Maximum number of frames to extract
 * @returns {Promise<{frames: Buffer[], timestamps: number[]}>}
 */
async function extractFrames(videoPath, maxFrames = CONFIG.MAX_FRAMES) {
  const metadata = await getVideoMetadata(videoPath);

  // Validate video
  if (metadata.duration > CONFIG.MAX_DURATION) {
    throw new Error(`Video duration ${metadata.duration}s exceeds maximum ${CONFIG.MAX_DURATION}s`);
  }

  if (metadata.width < CONFIG.MIN_RESOLUTION || metadata.height < CONFIG.MIN_RESOLUTION) {
    throw new Error(`Video resolution ${metadata.width}x${metadata.height} below minimum ${CONFIG.MIN_RESOLUTION}x${CONFIG.MIN_RESOLUTION}`);
  }

  // Calculate frame count based on duration
  const frameCount = Math.min(
    maxFrames,
    Math.max(CONFIG.MIN_FRAMES, Math.floor(metadata.duration * 2))
  );

  // Generate uniform timestamps
  const timestamps = [];
  for (let i = 0; i < frameCount; i++) {
    // Avoid exact 0 and end timestamps for better frame extraction
    const timestamp = (metadata.duration / (frameCount + 1)) * (i + 1);
    timestamps.push(Math.min(timestamp, metadata.duration - 0.1));
  }

  // Create temp directory for frame extraction
  const tempDir = path.join(os.tmpdir(), `video-frames-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const frames = [];
  try {
    for (let i = 0; i < timestamps.length; i++) {
      const outputPath = path.join(tempDir, `frame-${i}.${CONFIG.FRAME_FORMAT}`);
      const frameBuffer = await extractFrameAt(videoPath, timestamps[i], outputPath);
      frames.push(frameBuffer);
    }
  } finally {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }

  return { frames, timestamps, metadata };
}

/**
 * Compute SHA-256 hash of video file
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} 64-character hex string
 */
async function computeVideoSHA256(videoPath) {
  const buffer = await fs.readFile(videoPath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate fingerprints for a video file
 * @param {string} videoPath - Path to video file
 * @returns {Promise<VideoFingerprint|null>}
 *
 * @typedef {Object} VideoFingerprint
 * @property {string} sha256 - SHA-256 hash of video file
 * @property {string} mediaType - Always 'video'
 * @property {number} frameCount - Number of frames extracted
 * @property {number} duration - Video duration in seconds
 * @property {Array<{dHash: string, aHash: string, timestamp: number}>} frameHashes
 * @property {string} representativeDHash - dHash of representative frame
 * @property {string} representativeAHash - aHash of representative frame
 * @property {string} dHash - Alias for representativeDHash (compatibility)
 * @property {string} aHash - Alias for representativeAHash (compatibility)
 */
async function generateVideoFingerprints(videoPath) {
  try {
    // Validate input
    if (!videoPath || typeof videoPath !== 'string') {
      console.error('Video fingerprint: Invalid video path');
      return null;
    }

    // Check file exists
    try {
      await fs.access(videoPath);
    } catch {
      console.error('Video fingerprint: File not found:', videoPath);
      return null;
    }

    // Compute SHA-256 of entire video file
    const sha256 = await computeVideoSHA256(videoPath);

    // Extract frames
    const { frames, timestamps, metadata } = await extractFrames(videoPath);

    if (frames.length < CONFIG.MIN_FRAMES) {
      console.error('Video fingerprint: Not enough frames extracted');
      return null;
    }

    // Compute hashes for each frame
    const frameHashes = [];
    for (let i = 0; i < frames.length; i++) {
      const dHash = await computeDHash(frames[i]);
      const aHash = await computeAHash(frames[i]);

      if (dHash && aHash) {
        frameHashes.push({
          dHash,
          aHash,
          timestamp: timestamps[i],
          frameIndex: i
        });
      }
    }

    if (frameHashes.length === 0) {
      console.error('Video fingerprint: Failed to compute hashes for any frame');
      return null;
    }

    // Select representative frame (at 25% position)
    const repIndex = Math.floor(frameHashes.length * CONFIG.REPRESENTATIVE_POSITION);
    const representative = frameHashes[repIndex] || frameHashes[0];

    return {
      sha256,
      mediaType: 'video',
      frameCount: frameHashes.length,
      duration: metadata.duration,
      frameHashes,
      representativeDHash: representative.dHash,
      representativeAHash: representative.aHash,
      // Compatibility aliases for existing code that expects dHash/aHash at top level
      dHash: representative.dHash,
      aHash: representative.aHash
    };
  } catch (err) {
    console.error('Video fingerprint generation failed:', err.message);
    return null;
  }
}

/**
 * Check if ffmpeg is available on the system
 * @returns {Promise<boolean>}
 */
function checkFfmpegAvailable() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err);
    });
  });
}

/**
 * Count matching frames between two sets of frame hashes
 * @param {Array<{dHash: string}>} hashes1 - First set of frame hashes
 * @param {Array<{dHash: string}>} hashes2 - Second set of frame hashes
 * @param {number} threshold - Maximum Hamming distance to consider a match
 * @returns {number} Number of matching frame pairs
 */
function countMatchingFrames(hashes1, hashes2, threshold = 8) {
  const { hammingDistance } = require('./imageFingerprintService');
  let matches = 0;

  for (const h1 of hashes1) {
    for (const h2 of hashes2) {
      const distance = hammingDistance(h1.dHash, h2.dHash);
      if (distance <= threshold) {
        matches++;
        break; // Count each frame from hashes1 only once
      }
    }
  }

  return matches;
}

module.exports = {
  generateVideoFingerprints,
  extractFrames,
  getVideoMetadata,
  isVideoFile,
  checkFfmpegAvailable,
  countMatchingFrames,
  VIDEO_EXTENSIONS,
  CONFIG
};
