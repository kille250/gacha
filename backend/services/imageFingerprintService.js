/**
 * Image Fingerprint Service
 *
 * Generates perceptual hashes and cryptographic hashes for images
 * to enable duplicate and near-duplicate detection.
 *
 * Supports:
 * - SHA-256: Exact byte-for-byte duplicate detection
 * - dHash (Difference Hash): Perceptual similarity detection
 * - aHash (Average Hash): Color-based similarity detection
 */

const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs').promises;

/**
 * Compute SHA-256 hash of image buffer
 * @param {Buffer} buffer - Image data
 * @returns {string} 64-character hex string
 */
function computeSHA256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Compute dHash (Difference Hash) for perceptual similarity
 *
 * Algorithm:
 * 1. Resize to 9x8 grayscale
 * 2. Compare each pixel with its right neighbor
 * 3. Generate 64-bit hash (8 rows × 8 comparisons)
 *
 * @param {Buffer} buffer - Image data
 * @returns {Promise<string>} 16-character hex string (64 bits)
 */
async function computeDHash(buffer) {
  try {
    // Resize to 9x8 and convert to grayscale
    const pixels = await sharp(buffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    let hash = BigInt(0);

    // Compare adjacent pixels horizontally
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const leftIdx = row * 9 + col;
        const rightIdx = row * 9 + col + 1;

        if (pixels[leftIdx] > pixels[rightIdx]) {
          hash |= BigInt(1) << BigInt(row * 8 + col);
        }
      }
    }

    return hash.toString(16).padStart(16, '0');
  } catch (err) {
    console.error('dHash computation failed:', err.message);
    return null;
  }
}

/**
 * Compute aHash (Average Hash) for color-based similarity
 *
 * Algorithm:
 * 1. Resize to 8x8 grayscale
 * 2. Compute average pixel value
 * 3. Set bits for pixels above average
 *
 * @param {Buffer} buffer - Image data
 * @returns {Promise<string>} 16-character hex string (64 bits)
 */
async function computeAHash(buffer) {
  try {
    // Resize to 8x8 and convert to grayscale
    const pixels = await sharp(buffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Calculate average
    let sum = 0;
    for (let i = 0; i < 64; i++) {
      sum += pixels[i];
    }
    const avg = sum / 64;

    // Generate hash based on comparison with average
    let hash = BigInt(0);
    for (let i = 0; i < 64; i++) {
      if (pixels[i] > avg) {
        hash |= BigInt(1) << BigInt(i);
      }
    }

    return hash.toString(16).padStart(16, '0');
  } catch (err) {
    console.error('aHash computation failed:', err.message);
    return null;
  }
}

/**
 * Calculate Hamming distance between two hex hash strings
 *
 * @param {string} hash1 - First hash (hex string)
 * @param {string} hash2 - Second hash (hex string)
 * @returns {number} Number of differing bits (0-64)
 */
function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2) return 64; // Maximum distance if either is null

  try {
    const a = BigInt('0x' + hash1);
    const b = BigInt('0x' + hash2);
    let xor = a ^ b;
    let distance = 0;

    while (xor > 0n) {
      distance += Number(xor & 1n);
      xor >>= 1n;
    }

    return distance;
  } catch (err) {
    console.error('Hamming distance calculation failed:', err.message);
    return 64;
  }
}

/**
 * Convert Hamming distance to similarity percentage
 *
 * @param {number} distance - Hamming distance (0-64)
 * @returns {number} Similarity percentage (0-100)
 */
function distanceToSimilarity(distance) {
  return Math.round((1 - distance / 64) * 100);
}

/**
 * Generate all fingerprints for an image
 *
 * @param {string|Buffer} input - File path or image buffer
 * @returns {Promise<{sha256: string, dHash: string, aHash: string}|null>}
 */
async function generateFingerprints(input) {
  try {
    // Load image buffer
    let buffer;
    if (Buffer.isBuffer(input)) {
      buffer = input;
    } else {
      buffer = await fs.readFile(input);
    }

    // For videos/GIFs, extract first frame
    const metadata = await sharp(buffer).metadata();
    if (metadata.pages && metadata.pages > 1) {
      // Animated image - extract first frame
      buffer = await sharp(buffer, { page: 0 }).toBuffer();
    }

    // Compute all hashes in parallel
    const [sha256, dHash, aHash] = await Promise.all([
      Promise.resolve(computeSHA256(buffer)),
      computeDHash(buffer),
      computeAHash(buffer)
    ]);

    return { sha256, dHash, aHash };
  } catch (err) {
    console.error('Fingerprint generation failed:', err.message);
    return null;
  }
}

/**
 * Check if an image is processable by sharp
 *
 * @param {string} filePath - Path to image file
 * @returns {Promise<boolean>}
 */
async function isProcessableImage(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    return !!metadata.width && !!metadata.height;
  } catch {
    return false;
  }
}

module.exports = {
  generateFingerprints,
  computeSHA256,
  computeDHash,
  computeAHash,
  hammingDistance,
  distanceToSimilarity,
  isProcessableImage
};
