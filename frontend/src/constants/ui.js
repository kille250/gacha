/**
 * UI Constants
 *
 * Shared constants for UI components ensuring consistency across the application.
 * Import from here instead of hardcoding values in components.
 */

// ==================== COMPONENT VARIANTS ====================

/**
 * Button variants available across the application
 */
export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  GHOST: 'ghost',
  DANGER: 'danger',
  SUCCESS: 'success',
};

/**
 * Button sizes
 */
export const BUTTON_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
};

/**
 * Alert/feedback variants
 */
export const ALERT_VARIANTS = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info',
};

// ==================== STATE PATTERNS ====================

/**
 * Standard async operation states
 * Use for consistent loading/error/success handling
 */
export const ASYNC_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

/**
 * Form field states
 */
export const FIELD_STATES = {
  DEFAULT: 'default',
  FOCUSED: 'focused',
  ERROR: 'error',
  SUCCESS: 'success',
  DISABLED: 'disabled',
};

// ==================== PAGINATION ====================

/**
 * Default items per page options
 */
export const ITEMS_PER_PAGE_OPTIONS = [24, 48, 96];

/**
 * Default items per page
 */
export const DEFAULT_ITEMS_PER_PAGE = 24;

// ==================== MODAL SIZES ====================

/**
 * Modal size presets
 */
export const MODAL_SIZES = {
  SM: '400px',
  MD: '500px',
  LG: '700px',
  XL: '900px',
  FULL: '100%',
};

// ==================== ANIMATION DURATIONS ====================

/**
 * Standard animation durations (in ms)
 */
export const ANIMATION_DURATIONS = {
  INSTANT: 0,
  FAST: 150,
  NORMAL: 250,
  SLOW: 400,
  VERY_SLOW: 600,
};

// ==================== Z-INDEX LAYERS ====================

/**
 * Z-index layer definitions
 * Use these instead of arbitrary z-index values
 */
export const Z_LAYERS = {
  BASE: 1,
  DROPDOWN: 100,
  STICKY: 200,
  OVERLAY: 500,
  MODAL: 1000,
  TOAST: 1100,
  TOOLTIP: 1200,
  MAX: 9999,
};

// ==================== BREAKPOINTS ====================

/**
 * Responsive breakpoint values (in px)
 */
export const BREAKPOINTS = {
  XS: 375,
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536,
};

/**
 * Media query helpers
 */
export const MEDIA_QUERIES = {
  MOBILE: `(max-width: ${BREAKPOINTS.SM - 1}px)`,
  TABLET: `(min-width: ${BREAKPOINTS.SM}px) and (max-width: ${BREAKPOINTS.LG - 1}px)`,
  DESKTOP: `(min-width: ${BREAKPOINTS.LG}px)`,
  TOUCH: '(hover: none) and (pointer: coarse)',
  MOUSE: '(hover: hover) and (pointer: fine)',
  REDUCED_MOTION: '(prefers-reduced-motion: reduce)',
  DARK_MODE: '(prefers-color-scheme: dark)',
};

// ==================== TOUCH & ACCESSIBILITY ====================

/**
 * Minimum touch target size (WCAG AA)
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * Focus visible outline width
 */
export const FOCUS_OUTLINE_WIDTH = 2;

/**
 * Minimum contrast ratio for text (WCAG AA)
 */
export const MIN_CONTRAST_RATIO = 4.5;

// ==================== TOAST CONFIGURATION ====================

/**
 * Toast auto-dismiss durations (in ms)
 */
export const TOAST_DURATIONS = {
  SHORT: 3000,
  NORMAL: 5000,
  LONG: 8000,
  PERSISTENT: null, // Won't auto-dismiss
};

/**
 * Maximum toasts visible at once
 */
export const MAX_VISIBLE_TOASTS = 5;

// ==================== FORM VALIDATION ====================

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  PASSWORD_MIN_LENGTH: 8,
};

/**
 * Form field constraints
 */
export const FIELD_CONSTRAINTS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  BIO_MAX: 500,
};

// ==================== RARITY SYSTEM ====================

/**
 * Character rarity levels (ordered lowest to highest)
 */
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/**
 * Rarity display names
 */
export const RARITY_LABELS = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

// ==================== COLLECTION ====================

/**
 * Collection filter options
 */
export const COLLECTION_FILTERS = {
  OWNERSHIP: ['all', 'owned', 'not-owned'],
  SORT: ['name', 'rarity', 'series', 'recent'],
};

/**
 * Character level system
 */
export const CHARACTER_LEVELS = {
  MIN: 1,
  MAX: 5,
  SHARDS_PER_LEVEL: [0, 3, 5, 10, 15], // Shards needed for each level
};

// ==================== GACHA ====================

/**
 * Gacha roll costs
 */
export const GACHA_COSTS = {
  SINGLE: 100,
  MULTI: 1000, // 10 rolls
};

/**
 * Multi-roll count
 */
export const MULTI_ROLL_COUNT = 10;

// ==================== FISHING MINIGAME ====================

/**
 * Fishing game states
 */
export const FISHING_STATES = {
  IDLE: 'idle',
  CASTING: 'casting',
  WAITING: 'waiting',
  CATCHING: 'catching',
  REELING: 'reeling',
  SUCCESS: 'success',
  FAIL: 'fail',
};

/**
 * Fishing autofish configuration
 */
export const AUTOFISH_CONFIG = {
  DAILY_LIMIT: 50,
  COOLDOWN_MS: 5000,
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if viewport matches a media query
 * @param {string} query - Media query string
 * @returns {boolean}
 */
export const matchesMedia = (query) => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches;
};

/**
 * Check if device is touch-primary
 * @returns {boolean}
 */
export const isTouchDevice = () => matchesMedia(MEDIA_QUERIES.TOUCH);

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export const prefersReducedMotion = () => matchesMedia(MEDIA_QUERIES.REDUCED_MOTION);
