/**
 * Validation Utility Functions
 * 
 * Centralized input validation helpers used across routes
 */

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

module.exports = {
  isValidId,
  validateIdArray,
  parseCharacterIds
};
