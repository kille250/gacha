/**
 * Civitai API Constants
 *
 * Constants for integrating with Civitai's image search API.
 */

// API Configuration
export const CIVITAI_API_BASE = 'https://civitai.com/api/v1';
export const CIVITAI_IMAGES_ENDPOINT = `${CIVITAI_API_BASE}/images`;

// NSFW Levels - in order of restrictiveness
export const NSFW_LEVELS = {
  NONE: 'None',      // SFW only
  SOFT: 'Soft',      // Mild content (suggestive)
  MATURE: 'Mature',  // Adult themes (no explicit)
  X: 'X'             // Explicit content
};

// NSFW options for the dropdown
export const NSFW_OPTIONS = [
  { value: NSFW_LEVELS.NONE, label: 'SFW Only', description: 'Safe for work content only' },
  { value: NSFW_LEVELS.SOFT, label: 'Soft', description: 'Includes mildly suggestive content' },
  { value: NSFW_LEVELS.MATURE, label: 'Mature', description: 'Includes adult themes (non-explicit)' },
  { value: NSFW_LEVELS.X, label: 'All (18+)', description: 'Includes explicit content', requiresAgeGate: true }
];

// Sort options
export const SORT_OPTIONS = [
  { value: 'Most Reactions', label: 'Most Reactions' },
  { value: 'Newest', label: 'Newest' },
  { value: 'Most Comments', label: 'Most Comments' }
];

// Period options for filtering
export const PERIOD_OPTIONS = [
  { value: 'AllTime', label: 'All Time' },
  { value: 'Year', label: 'Past Year' },
  { value: 'Month', label: 'Past Month' },
  { value: 'Week', label: 'Past Week' },
  { value: 'Day', label: 'Today' }
];

// Default values
export const DEFAULTS = {
  NSFW: NSFW_LEVELS.NONE,
  SORT: 'Most Reactions',
  PERIOD: 'AllTime',
  LIMIT: 20,
  DEBOUNCE_MS: 300
};

// LocalStorage keys
export const STORAGE_KEYS = {
  NSFW_PREFERENCE: 'civitai_nsfw_preference',
  AGE_VERIFIED: 'civitai_age_verified',
  BLUR_NSFW: 'civitai_blur_nsfw'
};

// Rate limiting
export const RATE_LIMIT = {
  MIN_INTERVAL_MS: 1000,  // Minimum time between requests
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000
};
