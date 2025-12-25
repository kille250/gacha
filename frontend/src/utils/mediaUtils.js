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
 * Default placeholder image - SVG data URI (no external dependency)
 * Modern, minimal design matching the app's dark theme
 */
export const PLACEHOLDER_IMAGE = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
  <rect width="150" height="150" fill="#1c1c1e"/>
  <rect x="50" y="45" width="50" height="40" rx="4" fill="#2c2c2e"/>
  <circle cx="63" cy="58" r="6" fill="#3c3c3e"/>
  <path d="M53 80l12-15 10 10 15-18 12 23H53z" fill="#3c3c3e"/>
  <text x="75" y="105" text-anchor="middle" fill="#6c6c6e" font-family="system-ui" font-size="10">No Image</text>
</svg>
`)}`;

/**
 * Default placeholder for banner images - wider format
 */
export const PLACEHOLDER_BANNER = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150">
  <rect width="300" height="150" fill="#1c1c1e"/>
  <rect x="125" y="35" width="50" height="40" rx="4" fill="#2c2c2e"/>
  <circle cx="138" cy="48" r="6" fill="#3c3c3e"/>
  <path d="M128 70l12-15 10 10 15-18 12 23H128z" fill="#3c3c3e"/>
  <text x="150" y="100" text-anchor="middle" fill="#6c6c6e" font-family="system-ui" font-size="11">Banner</text>
</svg>
`)}`;

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
  if (!e.target.src.includes('data:image/svg') && !e.target.src.includes('placeholder')) {
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
  if (!e.target.src.includes('data:image/svg') && !e.target.src.includes('placeholder')) {
    e.target.src = placeholderUrl;
  }
  if (onError) {
    onError(e);
  }
};
