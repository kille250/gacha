/**
 * Image Utilities
 *
 * Helper functions for image processing, including downloading
 * and converting remote images to File objects.
 */

import api, { getAssetUrl } from './api';

/**
 * Download an image from a URL and convert it to a File object
 *
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} [filename] - Optional filename (default: generated-image.png)
 * @returns {Promise<File>} - A File object containing the image
 */
export const urlToFile = async (imageUrl, filename = 'generated-image.png') => {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();

    // Determine file extension from content type
    const contentType = blob.type || 'image/png';
    const extension = contentType.split('/')[1] || 'png';

    // Ensure filename has correct extension
    const finalFilename = filename.includes('.')
      ? filename
      : `${filename}.${extension}`;

    // Create File object from Blob
    const file = new File([blob], finalFilename, {
      type: contentType,
      lastModified: Date.now()
    });

    return file;
  } catch (error) {
    console.error('Error converting URL to File:', error);
    throw error;
  }
};

/**
 * Download an external image via backend proxy (bypasses CORS)
 * Used for AI-generated images from Stable Horde/R2 storage
 *
 * @param {string} imageUrl - The external URL of the image
 * @returns {Promise<{localUrl: string, filename: string}>} - Local URL path and filename
 */
export const proxyDownloadImage = async (imageUrl) => {
  const response = await api.post('/admin/proxy-image', { url: imageUrl });
  return {
    localUrl: response.data.localUrl,
    filename: response.data.filename
  };
};

/**
 * Download a proxied image and return both File and data URL
 * Used for AI-generated images that need CORS bypass
 *
 * @param {string} imageUrl - The external URL of the image
 * @param {string} [filename] - Optional filename override
 * @returns {Promise<{file: File, dataUrl: string, localUrl: string}>}
 */
export const downloadProxiedImageAsFile = async (imageUrl, filename) => {
  // First, proxy download through backend
  const { localUrl, filename: serverFilename } = await proxyDownloadImage(imageUrl);

  // Fetch the now-local image (no CORS issues)
  const fullUrl = getAssetUrl(localUrl);
  const file = await urlToFile(fullUrl, filename || serverFilename);
  const dataUrl = await fileToDataUrl(file);

  return { file, dataUrl, localUrl };
};

/**
 * Convert a File or Blob to a data URL for preview
 *
 * @param {File|Blob} file - The file to convert
 * @returns {Promise<string>} - Data URL string
 */
export const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Download an image and return both File and data URL
 *
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} [filename] - Optional filename
 * @returns {Promise<{file: File, dataUrl: string}>}
 */
export const downloadImageAsFile = async (imageUrl, filename = 'generated-image.png') => {
  const file = await urlToFile(imageUrl, filename);
  const dataUrl = await fileToDataUrl(file);

  return { file, dataUrl };
};

/**
 * Check if a URL is a valid image URL
 *
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} - Whether the URL points to a valid image
 */
export const isValidImageUrl = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return response.ok && contentType && contentType.startsWith('image/');
  } catch {
    return false;
  }
};

/**
 * Get image dimensions from a URL
 *
 * @param {string} url - Image URL
 * @returns {Promise<{width: number, height: number}>}
 */
export const getImageDimensions = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
};

export default {
  urlToFile,
  fileToDataUrl,
  downloadImageAsFile,
  downloadProxiedImageAsFile,
  proxyDownloadImage,
  isValidImageUrl,
  getImageDimensions
};
