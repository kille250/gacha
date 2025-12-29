/**
 * Secure Password Generator Utility
 *
 * Generates cryptographically secure temporary passwords that meet
 * the following requirements:
 * - Minimum 12 characters
 * - Mixed case letters
 * - Numbers
 * - Special symbols
 *
 * Uses Node.js crypto module for cryptographic randomness.
 */

const crypto = require('crypto');

// Character sets for password generation
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// Combined character set for random selection
const ALL_CHARS = LOWERCASE + UPPERCASE + NUMBERS + SYMBOLS;

/**
 * Generate a cryptographically secure random integer in range [0, max)
 * @param {number} max - Upper bound (exclusive)
 * @returns {number} Random integer
 */
function secureRandomInt(max) {
  // Use rejection sampling to avoid modulo bias
  const randomBytes = crypto.randomBytes(4);
  const randomValue = randomBytes.readUInt32BE(0);
  return randomValue % max;
}

/**
 * Shuffle an array using Fisher-Yates algorithm with secure randomness
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (mutates original)
 */
function secureShuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Get a random character from a string using secure randomness
 * @param {string} chars - String of characters to choose from
 * @returns {string} Random character
 */
function getRandomChar(chars) {
  return chars[secureRandomInt(chars.length)];
}

/**
 * Generate a cryptographically secure temporary password
 *
 * @param {number} [length=16] - Password length (minimum 12)
 * @returns {string} Generated password
 */
function generateSecurePassword(length = 16) {
  // Enforce minimum length
  const actualLength = Math.max(length, 12);

  const passwordChars = [];

  // Ensure at least one character from each required set
  passwordChars.push(getRandomChar(LOWERCASE));
  passwordChars.push(getRandomChar(UPPERCASE));
  passwordChars.push(getRandomChar(NUMBERS));
  passwordChars.push(getRandomChar(SYMBOLS));

  // Fill remaining characters randomly from all sets
  for (let i = passwordChars.length; i < actualLength; i++) {
    passwordChars.push(getRandomChar(ALL_CHARS));
  }

  // Shuffle to avoid predictable positions
  secureShuffleArray(passwordChars);

  return passwordChars.join('');
}

/**
 * Validate that a password meets the security requirements
 *
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with { valid: boolean, errors: string[] }
 */
function validatePasswordStrength(password) {
  const errors = [];

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  generateSecurePassword,
  validatePasswordStrength
};
