/**
 * Sequence number management for Essence Tap WebSocket handlers
 */

// In-memory sequence tracking per user
const userSequences = new Map();

/**
 * Get the next sequence number for a user
 * @param {number} userId - User ID
 * @returns {number} Next sequence number
 */
function getNextSequence(userId) {
  const current = userSequences.get(userId) || 0;
  const next = current + 1;
  userSequences.set(userId, next);
  return next;
}

/**
 * Get the current sequence number for a user
 * @param {number} userId - User ID
 * @returns {number} Current sequence number
 */
function getCurrentSequence(userId) {
  return userSequences.get(userId) || 0;
}

/**
 * Reset sequence number for a user (used on disconnect)
 * @param {number} userId - User ID
 */
function resetSequence(userId) {
  userSequences.delete(userId);
}

/**
 * Set sequence number for a user (used on reconnect)
 * @param {number} userId - User ID
 * @param {number} seq - Sequence number
 */
function setSequence(userId, seq) {
  userSequences.set(userId, seq);
}

module.exports = {
  getNextSequence,
  getCurrentSequence,
  resetSequence,
  setSequence
};
