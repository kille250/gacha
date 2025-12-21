/**
 * Validation Utility Functions
 * 
 * Centralized input validation helpers used across routes
 */

// Reserved usernames that cannot be registered
const RESERVED_USERNAMES = ['admin', 'administrator', 'root', 'system', 'moderator', 'mod', 'support', 'help'];

/**
 * Validate that a value is a positive integer
 * @param {any} value - Value to validate
 * @returns {boolean} - True if valid positive integer
 */
const isValidId = (value) => {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && String(num) === String(value);
};

/**
 * Validate an array of IDs
 * @param {any} arr - Array to validate
 * @returns {boolean} - True if all elements are valid IDs
 */
const validateIdArray = (arr) => {
  if (!Array.isArray(arr)) return false;
  return arr.every(id => isValidId(id));
};

/**
 * Safely parse character IDs from request body
 * @param {string} characterIdsStr - JSON string of character IDs
 * @returns {number[]|null} - Parsed array or null if invalid
 */
const parseCharacterIds = (characterIdsStr) => {
  if (!characterIdsStr) return [];
  try {
    const parsed = JSON.parse(characterIdsStr);
    if (!Array.isArray(parsed)) return null;
    // Ensure all values are positive integers
    const validated = parsed.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0);
    if (validated.length !== parsed.length) return null;
    return validated;
  } catch (e) {
    return null;
  }
};

/**
 * Validate username for registration/login
 * @param {string} username - Username to validate
 * @returns {{ valid: boolean, error?: string, value?: string }}
 */
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 30) {
    return { valid: false, error: 'Username must be at most 30 characters' };
  }
  
  // Only allow alphanumeric characters, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  // Block reserved usernames
  if (RESERVED_USERNAMES.includes(trimmed.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' };
  }
  
  return { valid: true, value: trimmed };
};

/**
 * Validate password for registration
 * @param {string} password - Password to validate
 * @returns {{ valid: boolean, error?: string }}
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password must be at most 128 characters' };
  }
  
  // Require at least one number and one letter
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter and one number' };
  }
  
  return { valid: true };
};

/**
 * Validate email for registration
 * @param {string} email - Email to validate
 * @returns {{ valid: boolean, error?: string, value?: string }}
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const trimmed = email.trim().toLowerCase();
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }
  
  return { valid: true, value: trimmed };
};

/**
 * Validate UUID format (v1-v5)
 * @param {string} value - Value to validate
 * @returns {boolean} - True if valid UUID
 */
const isValidUUID = (value) => {
  if (!value || typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Parse date value - converts empty/invalid strings to null
 * @param {any} dateValue - Date value to parse (string, Date, or null/undefined)
 * @returns {Date|null} - Valid Date object or null
 */
const parseDate = (dateValue) => {
  if (!dateValue || dateValue === '') return null;
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date;
};

module.exports = {
  isValidId,
  validateIdArray,
  parseCharacterIds,
  validateUsername,
  validatePassword,
  validateEmail,
  isValidUUID,
  parseDate,
  RESERVED_USERNAMES
};
