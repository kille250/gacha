/**
 * Date Utility Functions
 *
 * Centralized date formatting and parsing helpers
 */

/**
 * Format a date value for HTML date input (YYYY-MM-DD)
 * @param {Date|string|null} dateValue - Date to format
 * @returns {string} - Formatted date string or empty string if invalid
 */
export const formatDateForInput = (dateValue) => {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

/**
 * Get today's date formatted for HTML date input
 * @returns {string} - Today's date as YYYY-MM-DD
 */
export const getTodayForInput = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Parse a date string safely
 * @param {string|Date|null} dateValue - Date value to parse
 * @param {Date|null} [defaultValue=null] - Default if parsing fails
 * @returns {Date|null} - Parsed Date or defaultValue
 */
export const parseDate = (dateValue, defaultValue = null) => {
  if (!dateValue || dateValue === '' || dateValue === 'Invalid date' || dateValue === 'null') {
    return defaultValue;
  }
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? defaultValue : date;
};

/**
 * Check if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} - True if date is before now
 */
export const isDateInPast = (date) => {
  const d = new Date(date);
  return !isNaN(d.getTime()) && d < new Date();
};

/**
 * Check if a date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} - True if date is after now
 */
export const isDateInFuture = (date) => {
  const d = new Date(date);
  return !isNaN(d.getTime()) && d > new Date();
};

const dateUtils = {
  formatDateForInput,
  getTodayForInput,
  parseDate,
  isDateInPast,
  isDateInFuture,
};

export default dateUtils;
