/**
 * Broadcast utilities for Essence Tap WebSocket handlers
 */

/**
 * Broadcast a message to all sockets for a specific user
 * @param {Object} namespace - Socket.io namespace
 * @param {number} userId - User ID to broadcast to
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
function broadcastToUser(namespace, userId, event, data) {
  const room = `user:${userId}`;
  namespace.to(room).emit(event, data);
}

/**
 * Get the room name for a user
 * @param {number} userId - User ID
 * @returns {string} Room name
 */
function getUserRoom(userId) {
  return `user:${userId}`;
}

module.exports = {
  broadcastToUser,
  getUserRoom
};
