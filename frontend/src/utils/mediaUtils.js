/**
 * Media Utility Functions
 * 
 * Centralized helpers for handling media files (images, videos)
 * Used across the application for consistent media type detection
 */

/**
 * Determines if a given file or path is a video
 * @param {File|string} file - A File object or string path
 * @returns {boolean} - True if the file is a video
 */
export const isVideo = (file) => {
  if (!file) return false;
  
  // Handle File objects
  if (file instanceof File || (file.type && typeof file.type === 'string')) {
    return file.type.startsWith('video/');
  }
  
  // Handle string paths
  if (typeof file === 'string') {
    const lowerCasePath = file.toLowerCase();
    return (
      lowerCasePath.endsWith('.mp4') || 
      lowerCasePath.endsWith('.webm') || 
      lowerCasePath.includes('/videos/') ||
      lowerCasePath.includes('video')
    );
  }
  
  return false;
};

/**
 * Gets the appropriate video MIME type based on file extension
 * @param {string} path - Video file path
 * @returns {string} - MIME type string
 */
export const getVideoMimeType = (path) => {
  if (!path || typeof path !== 'string') return 'video/mp4';
  return path.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
};

/**
 * Default placeholder image URL
 */
export const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/150?text=No+Image';

/**
 * Default placeholder for banner images
 */
export const PLACEHOLDER_BANNER = 'https://via.placeholder.com/300x150?text=Banner';

/**
 * Creates an image error handler that falls back to a placeholder
 * Prevents infinite loops by checking if already showing placeholder
 *
 * @param {string} placeholderUrl - URL of the placeholder image (defaults to PLACEHOLDER_IMAGE)
 * @returns {Function} - Event handler for img onError
 *
 * @example
 * <img
 *   src={character.imageUrl}
 *   onError={createImageErrorHandler()}
 *   alt={character.name}
 * />
 */
export const createImageErrorHandler = (placeholderUrl = PLACEHOLDER_IMAGE) => (e) => {
  // Prevent infinite loop if placeholder also fails
  if (!e.target.src.includes('placeholder')) {
    e.target.src = placeholderUrl;
  }
};

/**
 * Handles image load errors with optional callback
 *
 * @param {Event} e - Image error event
 * @param {string} placeholderUrl - Fallback URL
 * @param {Function} onError - Optional callback after handling
 */
export const handleImageError = (e, placeholderUrl = PLACEHOLDER_IMAGE, onError = null) => {
  if (!e.target.src.includes('placeholder')) {
    e.target.src = placeholderUrl;
  }
  if (onError) {
    onError(e);
  }
};
