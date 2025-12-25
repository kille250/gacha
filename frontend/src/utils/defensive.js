/**
 * Defensive UI Utilities
 *
 * Utility functions for preventing UI errors from invalid, null, or unexpected data.
 * These helpers ensure graceful degradation when data is missing or malformed.
 *
 * @architecture
 * - All functions are pure and have no side effects
 * - All functions handle null/undefined gracefully
 * - No function should throw - they return safe fallback values
 * - Designed for use in JSX rendering context
 */

// ============================================
// VALUE SAFETY
// ============================================

/**
 * Safely get a value with fallback
 * @param {*} value - The value to check
 * @param {*} fallback - Fallback if value is null/undefined
 * @returns {*} The value or fallback
 */
export const safeValue = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return value;
};

/**
 * Safely get a number with fallback
 * Handles NaN, Infinity, and non-numeric values
 * @param {*} value - The value to check
 * @param {number} fallback - Fallback if value is invalid
 * @returns {number} A valid number
 */
export const safeNumber = (value, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
  return num;
};

/**
 * Safely get a string with fallback
 * @param {*} value - The value to check
 * @param {string} fallback - Fallback string
 * @returns {string} A valid string
 */
export const safeString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

/**
 * Safely get an array with fallback
 * @param {*} value - The value to check
 * @param {Array} fallback - Fallback array
 * @returns {Array} A valid array
 */
export const safeArray = (value, fallback = []) => {
  if (!Array.isArray(value)) return fallback;
  return value;
};

/**
 * Safely get an object with fallback
 * @param {*} value - The value to check
 * @param {Object} fallback - Fallback object
 * @returns {Object} A valid object
 */
export const safeObject = (value, fallback = {}) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }
  return value;
};

/**
 * Safely get a boolean with fallback
 * @param {*} value - The value to check
 * @param {boolean} fallback - Fallback boolean
 * @returns {boolean} A valid boolean
 */
export const safeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

// ============================================
// FORMATTING SAFETY
// ============================================

/**
 * Safely format a number with locale string
 * @param {*} value - Number to format
 * @param {string} locale - Locale string
 * @param {Object} options - Intl.NumberFormat options
 * @returns {string} Formatted number or fallback
 */
export const safeFormatNumber = (value, locale = 'en-US', options = {}) => {
  const num = safeNumber(value);
  try {
    return new Intl.NumberFormat(locale, options).format(num);
  } catch (e) {
    return String(num);
  }
};

/**
 * Safely format a date
 * @param {*} value - Date value (Date object, timestamp, or string)
 * @param {string} fallback - Fallback string
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date or fallback
 */
export const safeFormatDate = (value, fallback = 'N/A', options = {}) => {
  if (!value) return fallback;

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    }).format(date);
  } catch (e) {
    return fallback;
  }
};

/**
 * Safely format currency
 * @param {*} value - Amount
 * @param {string} currency - Currency code
 * @param {string} locale - Locale
 * @returns {string} Formatted currency
 */
export const safeFormatCurrency = (value, currency = 'USD', locale = 'en-US') => {
  return safeFormatNumber(value, locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

/**
 * Safely format percentage
 * @param {*} value - Value (0-100 or 0-1)
 * @param {boolean} isDecimal - If true, value is 0-1 range
 * @returns {string} Formatted percentage
 */
export const safeFormatPercent = (value, isDecimal = false) => {
  let num = safeNumber(value);
  if (isDecimal) num *= 100;
  return `${Math.round(num)}%`;
};

/**
 * Safely truncate text with ellipsis
 * @param {*} value - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix for truncated text
 * @returns {string} Truncated text
 */
export const safeTruncate = (value, maxLength = 50, suffix = '...') => {
  const str = safeString(value);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
};

// ============================================
// OBJECT PROPERTY SAFETY
// ============================================

/**
 * Safely get a nested property from an object
 * @param {Object} obj - The object
 * @param {string} path - Dot-notation path (e.g., 'user.profile.name')
 * @param {*} fallback - Fallback value
 * @returns {*} The value or fallback
 */
export const safeGet = (obj, path, fallback = undefined) => {
  if (!obj || typeof obj !== 'object') return fallback;
  if (!path) return fallback;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return fallback;
    current = current[key];
  }

  return current !== undefined ? current : fallback;
};

/**
 * Safely access first item of an array
 * @param {*} arr - The array
 * @param {*} fallback - Fallback value
 * @returns {*} First item or fallback
 */
export const safeFirst = (arr, fallback = undefined) => {
  const safe = safeArray(arr);
  return safe.length > 0 ? safe[0] : fallback;
};

/**
 * Safely access last item of an array
 * @param {*} arr - The array
 * @param {*} fallback - Fallback value
 * @returns {*} Last item or fallback
 */
export const safeLast = (arr, fallback = undefined) => {
  const safe = safeArray(arr);
  return safe.length > 0 ? safe[safe.length - 1] : fallback;
};

// ============================================
// CONDITIONAL RENDERING HELPERS
// ============================================

/**
 * Safely render a value or placeholder
 * @param {*} value - Value to check
 * @param {string} placeholder - Placeholder if empty
 * @returns {string} Value or placeholder
 */
export const renderOrPlaceholder = (value, placeholder = '—') => {
  if (value === null || value === undefined || value === '') {
    return placeholder;
  }
  return String(value);
};

/**
 * Safely render a count with singular/plural labels
 * @param {*} count - The count
 * @param {string} singular - Singular label
 * @param {string} plural - Plural label
 * @returns {string} Formatted count string
 */
export const renderCount = (count, singular, plural) => {
  const num = safeNumber(count);
  const label = num === 1 ? singular : plural;
  return `${safeFormatNumber(num)} ${label}`;
};

/**
 * Safely render a list with conjunction
 * @param {*} items - Array of items
 * @param {string} conjunction - Conjunction word (e.g., 'and', 'or')
 * @param {string} fallback - Fallback if empty
 * @returns {string} Joined string
 */
export const renderList = (items, conjunction = 'and', fallback = 'None') => {
  const arr = safeArray(items).filter(Boolean);
  if (arr.length === 0) return fallback;
  if (arr.length === 1) return String(arr[0]);
  if (arr.length === 2) return `${arr[0]} ${conjunction} ${arr[1]}`;

  const last = arr.pop();
  return `${arr.join(', ')}, ${conjunction} ${last}`;
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Check if a value is a valid non-empty array
 * @param {*} value - Value to check
 * @returns {boolean} True if valid non-empty array
 */
export const isNonEmptyArray = (value) => {
  return Array.isArray(value) && value.length > 0;
};

/**
 * Check if a value is a valid non-empty string
 * @param {*} value - Value to check
 * @returns {boolean} True if valid non-empty string
 */
export const isNonEmptyString = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Check if value is a valid positive number
 * @param {*} value - Value to check
 * @returns {boolean} True if valid positive number
 */
export const isPositiveNumber = (value) => {
  const num = Number(value);
  return !Number.isNaN(num) && Number.isFinite(num) && num > 0;
};

// ============================================
// ERROR RECOVERY HELPERS
// ============================================

/**
 * Wrap a function to catch errors and return fallback
 * Useful for computed values that might fail
 * @param {Function} fn - Function to wrap
 * @param {*} fallback - Fallback on error
 * @returns {*} Result or fallback
 */
export const safeTry = (fn, fallback = null) => {
  try {
    return fn();
  } catch (e) {
    console.warn('safeTry caught error:', e);
    return fallback;
  }
};

/**
 * Wrap an async function to catch errors and return fallback
 * @param {Function} fn - Async function to wrap
 * @param {*} fallback - Fallback on error
 * @returns {Promise<*>} Result or fallback
 */
export const safeAsync = async (fn, fallback = null) => {
  try {
    return await fn();
  } catch (e) {
    console.warn('safeAsync caught error:', e);
    return fallback;
  }
};

/**
 * Create a safe event handler that won't throw
 * @param {Function} handler - Event handler
 * @param {Function} onError - Optional error callback
 * @returns {Function} Safe handler
 */
export const safeHandler = (handler, onError) => {
  return (...args) => {
    try {
      return handler(...args);
    } catch (e) {
      console.error('Event handler error:', e);
      if (onError) onError(e);
    }
  };
};

// ============================================
// IMAGE SAFETY
// ============================================

/**
 * Get safe image URL with fallback
 * @param {*} url - Image URL
 * @param {string} fallback - Fallback URL
 * @returns {string} Valid URL
 */
export const safeImageUrl = (url, fallback = '/placeholder.png') => {
  if (!url || typeof url !== 'string') return fallback;
  if (url.trim() === '') return fallback;
  return url;
};

/**
 * Get safe alt text from name or fallback
 * @param {string} name - Item name
 * @param {string} fallback - Fallback text
 * @returns {string} Alt text
 */
export const safeAltText = (name, fallback = 'Image') => {
  const str = safeString(name).trim();
  return str || fallback;
};

// ============================================
// TYPE GUARDS FOR TYPESCRIPT-LIKE SAFETY
// ============================================

/**
 * Assert value is defined (throws if null/undefined in development)
 * @param {*} value - Value to check
 * @param {string} name - Name for error message
 * @returns {*} The value if defined
 */
export const assertDefined = (value, name = 'Value') => {
  if (value === null || value === undefined) {
    const error = `${name} must be defined`;
    if (process.env.NODE_ENV === 'development') {
      throw new Error(error);
    }
    console.error(error);
  }
  return value;
};

/**
 * Clamp a number between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export const clamp = (value, min, max) => {
  const num = safeNumber(value);
  return Math.min(Math.max(num, min), max);
};

// Export as default object for convenience
const defensive = {
  // Value safety
  safeValue,
  safeNumber,
  safeString,
  safeArray,
  safeObject,
  safeBoolean,
  // Formatting
  safeFormatNumber,
  safeFormatDate,
  safeFormatCurrency,
  safeFormatPercent,
  safeTruncate,
  // Property access
  safeGet,
  safeFirst,
  safeLast,
  // Rendering
  renderOrPlaceholder,
  renderCount,
  renderList,
  // Validation
  isEmpty,
  isNonEmptyArray,
  isNonEmptyString,
  isPositiveNumber,
  // Error recovery
  safeTry,
  safeAsync,
  safeHandler,
  // Images
  safeImageUrl,
  safeAltText,
  // Type guards
  assertDefined,
  clamp,
};

export default defensive;
