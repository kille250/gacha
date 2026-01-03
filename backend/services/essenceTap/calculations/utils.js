/**
 * Utility Functions
 *
 * Pure utility functions for formatting and common operations.
 * These can be used across backend and potentially shared with frontend.
 */

/**
 * Format a large number for display
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string} Formatted number string
 */
function formatNumber(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue < 1000) {
    return sign + Math.floor(absValue).toString();
  }

  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

  let suffixIndex = 0;
  let displayValue = absValue;

  while (displayValue >= 1000 && suffixIndex < suffixes.length - 1) {
    displayValue /= 1000;
    suffixIndex++;
  }

  return sign + displayValue.toFixed(decimals) + suffixes[suffixIndex];
}

/**
 * Format a per-second rate for display
 * @param {number} value - Rate per second
 * @returns {string} Formatted rate string
 */
function formatPerSecond(value) {
  return formatNumber(value) + '/s';
}

/**
 * Format session duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatSessionDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Format time remaining for display
 * @param {number} ms - Time remaining in milliseconds
 * @returns {string} Formatted time string
 */
function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Ready';

  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Get current ISO week string
 * @param {Date} date - Date to get week for (default: now)
 * @returns {string} ISO week string (e.g., "2025-W01")
 */
function getCurrentWeekId(date = new Date()) {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((date - yearStart) / 86400000) + yearStart.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get today's date string
 * @param {Date} date - Date to format (default: now)
 * @returns {string} Date string (e.g., "2025-01-15")
 */
function getTodayDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Safely parse a number, returning default if invalid
 * @param {*} value - Value to parse
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Parsed number or default
 */
function safeParseNumber(value, defaultValue = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  return parsed;
}

/**
 * Safely parse a positive integer, returning default if invalid
 * @param {*} value - Value to parse
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Parsed positive integer or default
 */
function safeParsePositiveInt(value, defaultValue = 1) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

/**
 * Calculate percentage (with safety checks)
 * @param {number} part - The part
 * @param {number} whole - The whole
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {number} Percentage (0-100)
 */
function calculatePercentage(part, whole, decimals = 1) {
  if (!whole || whole === 0) return 0;
  const pct = (part / whole) * 100;
  const multiplier = Math.pow(10, decimals);
  return Math.round(pct * multiplier) / multiplier;
}

/**
 * Deep clone an object (simple JSON-based clone)
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects with default values
 * @param {Object} target - Target object (may have missing keys)
 * @param {Object} defaults - Default values
 * @returns {Object} Merged object
 */
function mergeWithDefaults(target = {}, defaults = {}) {
  const result = { ...defaults };

  for (const key of Object.keys(target)) {
    if (target[key] !== undefined && target[key] !== null) {
      if (typeof target[key] === 'object' && !Array.isArray(target[key]) &&
          typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
        result[key] = mergeWithDefaults(target[key], defaults[key]);
      } else {
        result[key] = target[key];
      }
    }
  }

  return result;
}

/**
 * Derive element for characters without an explicitly set element
 * Uses a deterministic algorithm based on character properties
 *
 * @param {number} characterId - The character's database ID
 * @param {string} rarity - The character's rarity (common, uncommon, rare, epic, legendary)
 * @returns {string} The derived element (fire, water, earth, air, light, dark, neutral)
 */
function deriveElement(characterId, rarity = 'common') {
  // Element derivation configuration
  const ELEMENT_DERIVATION = {
    // Element weights by rarity (some rarities favor certain elements)
    rarityWeights: {
      common: { neutral: 0.40, fire: 0.12, water: 0.12, earth: 0.12, air: 0.12, light: 0.06, dark: 0.06 },
      uncommon: { neutral: 0.30, fire: 0.14, water: 0.14, earth: 0.14, air: 0.14, light: 0.07, dark: 0.07 },
      rare: { neutral: 0.20, fire: 0.16, water: 0.16, earth: 0.16, air: 0.16, light: 0.08, dark: 0.08 },
      epic: { neutral: 0.15, fire: 0.15, water: 0.15, earth: 0.15, air: 0.15, light: 0.125, dark: 0.125 },
      legendary: { neutral: 0.10, fire: 0.15, water: 0.15, earth: 0.15, air: 0.15, light: 0.15, dark: 0.15 }
    },
    fallbackElement: 'neutral'
  };

  const elements = ['fire', 'water', 'earth', 'air', 'light', 'dark', 'neutral'];
  const weights = ELEMENT_DERIVATION.rarityWeights[rarity] || ELEMENT_DERIVATION.rarityWeights.common;

  // Use character ID as seed for deterministic element
  // This ensures the same character always gets the same element
  const seed = characterId * 2654435761 % 4294967296;
  const normalized = seed / 4294967296;

  let cumulative = 0;
  for (const element of elements) {
    cumulative += weights[element];
    if (normalized < cumulative) {
      return element;
    }
  }

  return ELEMENT_DERIVATION.fallbackElement;
}

module.exports = {
  formatNumber,
  formatPerSecond,
  formatSessionDuration,
  formatTimeRemaining,
  getCurrentWeekId,
  getTodayDateString,
  clamp,
  safeParseNumber,
  safeParsePositiveInt,
  calculatePercentage,
  deepClone,
  mergeWithDefaults,
  deriveElement
};
