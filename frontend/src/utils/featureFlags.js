/**
 * Feature Flags - Simple feature toggle system
 *
 * Usage:
 * - Check if feature is enabled: isEnabled(FEATURES.NEW_VALIDATION_UI)
 * - Enable in console: localStorage.setItem('ff:new-validation-ui', 'true')
 * - Disable: localStorage.setItem('ff:new-validation-ui', 'false')
 */

export const FEATURES = {
  NEW_VALIDATION_UI: 'new-validation-ui',
  SWIPE_TO_DELETE: 'swipe-to-delete',
  UNDO_REMOVAL: 'undo-removal',
  ENHANCED_PROGRESS: 'enhanced-progress',
  REDUCED_MOTION: 'reduced-motion',
  FOCUS_FIRST_ERROR: 'focus-first-error',
};

/**
 * Check if a feature is enabled
 * @param {string} feature - Feature key from FEATURES
 * @returns {boolean}
 */
export const isEnabled = (feature) => {
  // All features enabled by default for new implementation
  const defaultEnabled = [
    FEATURES.NEW_VALIDATION_UI,
    FEATURES.UNDO_REMOVAL,
    FEATURES.ENHANCED_PROGRESS,
    FEATURES.REDUCED_MOTION,
    FEATURES.SWIPE_TO_DELETE,
    FEATURES.FOCUS_FIRST_ERROR,
  ];

  const stored = localStorage.getItem(`ff:${feature}`);

  if (stored !== null) {
    return stored === 'true';
  }

  return defaultEnabled.includes(feature);
};

/**
 * Enable a feature
 * @param {string} feature - Feature key from FEATURES
 */
export const enableFeature = (feature) => {
  localStorage.setItem(`ff:${feature}`, 'true');
};

/**
 * Disable a feature
 * @param {string} feature - Feature key from FEATURES
 */
export const disableFeature = (feature) => {
  localStorage.setItem(`ff:${feature}`, 'false');
};

/**
 * Reset feature to default
 * @param {string} feature - Feature key from FEATURES
 */
export const resetFeature = (feature) => {
  localStorage.removeItem(`ff:${feature}`);
};

/**
 * Get all feature states
 * @returns {Object} Map of feature to enabled state
 */
export const getAllFeatures = () => {
  return Object.entries(FEATURES).reduce((acc, [key, value]) => {
    acc[key] = isEnabled(value);
    return acc;
  }, {});
};

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export const prefersReducedMotion = () => {
  if (!isEnabled(FEATURES.REDUCED_MOTION)) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const featureFlags = {
  FEATURES,
  isEnabled,
  enableFeature,
  disableFeature,
  resetFeature,
  getAllFeatures,
  prefersReducedMotion,
};

export default featureFlags;
