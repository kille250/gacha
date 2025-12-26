/**
 * File Utility Functions
 *
 * Centralized file operations for safe deletion and image downloading
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { UPLOAD_DIRS, getFilePath } = require('../config/upload');

// Default timeout for HTTP requests (30 seconds)
const DEFAULT_DOWNLOAD_TIMEOUT = 30000;

/**
 * Safely delete a file, ignoring errors if file doesn't exist
 * @param {string} filepath - Full path to file
 */
const safeUnlink = (filepath) => {
  try {
    if (filepath && fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err) {
    console.error(`Failed to delete file ${filepath}:`, err.message);
  }
};

/**
 * Safely delete an uploaded file by URL path
 * Only deletes files that were uploaded (start with /uploads/)
 * @param {string} urlPath - URL path like /uploads/characters/image.jpg
 * @param {string} type - Upload type (characters, banners, videos)
 */
const safeDeleteUpload = (urlPath, type = 'characters') => {
  if (urlPath && urlPath.startsWith('/uploads/')) {
    const filename = path.basename(urlPath);
    const filepath = getFilePath(type, filename);
    safeUnlink(filepath);
  }
};

/**
 * Delete multiple files safely (for batch operations)
 * @param {Array<{path: string}>} files - Array of file objects with path property
 */
const safeUnlinkMany = (files) => {
  if (!Array.isArray(files)) return;
  files.forEach(file => {
    if (file?.path) safeUnlink(file.path);
  });
};

/**
 * Build HTTP request options for image download
 * @param {URL} targetUrl - Parsed URL object
 * @returns {object} HTTP request options
 */
const buildRequestOptions = (targetUrl) => ({
  hostname: targetUrl.hostname,
  port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
  path: targetUrl.pathname + targetUrl.search,
  method: 'GET',
  headers: {
    'User-Agent': 'GachaApp/1.0 (Anime Character Import Tool)',
    'Accept': '*/*',
    'Referer': targetUrl.origin
  }
});

/**
 * Download image/video from URL and save locally
 * Handles redirects and validates downloaded file size
 * @param {string} url - URL to download from
 * @param {string} filename - Local filename to save as
 * @param {string} uploadType - Upload directory type (characters, banners, videos)
 * @param {object} options - Optional configuration
 * @param {number} options.maxRedirects - Maximum redirects to follow (default: 5)
 * @param {number} options.minFileSize - Minimum file size in bytes (default: 500)
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @returns {Promise<string>} - Resolves with filepath on success
 */
const downloadImage = (url, filename, uploadType = 'characters', options = {}) => {
  const { maxRedirects = 5, minFileSize = 500, timeout = DEFAULT_DOWNLOAD_TIMEOUT } = options;

  return new Promise((resolve, reject) => {
    const filepath = path.join(UPLOAD_DIRS[uploadType] || UPLOAD_DIRS.characters, filename);
    let aborted = false;

    const makeRequest = (currentUrl, redirectCount = 0) => {
      if (redirectCount > maxRedirects) {
        reject(new Error('Too many redirects'));
        return;
      }

      const targetUrl = new URL(currentUrl);
      const protocol = targetUrl.protocol === 'https:' ? https : http;
      const requestOptions = buildRequestOptions(targetUrl);

      const req = protocol.request(requestOptions, (response) => {
        // Handle redirects (301, 302, 303, 307, 308)
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const redirectUrl = new URL(response.headers.location, currentUrl);
          console.log(`Following redirect ${redirectCount + 1}: ${redirectUrl.href}`);
          makeRequest(redirectUrl.href, redirectCount + 1);
          return;
        }

        // Check for successful response
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        // Create write stream only after we have a successful response
        const file = fs.createWriteStream(filepath);

        file.on('error', (err) => {
          fs.unlink(filepath, () => {});
          reject(err);
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            if (aborted) return; // Don't resolve if we already aborted
            // Verify the file was actually downloaded
            fs.stat(filepath, (err, stats) => {
              if (err || stats.size < minFileSize) {
                fs.unlink(filepath, () => {});
                reject(new Error('Downloaded file is too small or corrupted'));
              } else {
                console.log(`Downloaded ${filename}: ${stats.size} bytes`);
                resolve(filepath);
              }
            });
          });
        });
      });

      // Set socket timeout to prevent hanging connections
      req.setTimeout(timeout, () => {
        aborted = true;
        req.destroy();
        fs.unlink(filepath, () => {});
        reject(new Error(`Download timeout after ${timeout}ms`));
      });

      req.on('error', (err) => {
        if (aborted) return; // Already handled by timeout
        fs.unlink(filepath, () => {});
        reject(err);
      });

      req.end();
    };

    makeRequest(url);
  });
};

/**
 * Generate a unique filename for imports
 * @param {string} prefix - Filename prefix (e.g., 'imported', 'alt')
 * @param {string} ext - File extension including dot (e.g., '.jpg')
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (prefix = 'file', ext = '.jpg') => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${timestamp}-${randomPart}${ext}`;
};

/**
 * Get file extension from URL, with fallback
 * @param {string} url - URL to extract extension from
 * @param {string} fallback - Fallback extension (default: '.jpg')
 * @returns {string} File extension including dot
 */
const getExtensionFromUrl = (url, fallback = '.jpg') => {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.mp4'];
    return validExtensions.includes(ext) ? ext : fallback;
  } catch {
    return fallback;
  }
};

module.exports = {
  safeUnlink,
  safeDeleteUpload,
  safeUnlinkMany,
  downloadImage,
  generateUniqueFilename,
  getExtensionFromUrl
};

