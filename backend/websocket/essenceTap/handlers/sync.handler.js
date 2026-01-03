/**
 * Sync Handlers - State synchronization operations
 */

const { User } = require('../../../models');
const essenceTapService = require('../../../services/essenceTapService');
const { getNextSequence } = require('../utils/sequence');

/**
 * Handle sync request from client
 * Sends full state without modifying it
 */
async function handleSyncRequest(socket, userId, _namespace) {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      socket.emit('error', {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
      return;
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    // Reset daily if needed (read-only check)
    state = essenceTapService.resetDaily(state);

    // Calculate any offline progress
    const now = Date.now();
    const offlineProgress = essenceTapService.calculateOfflineProgress(state, now);

    if (offlineProgress.essenceEarned > 0) {
      state = {
        ...state,
        essence: state.essence + offlineProgress.essenceEarned,
        lifetimeEssence: state.lifetimeEssence + offlineProgress.essenceEarned,
        lastOnlineTimestamp: now
      };

      // Save the updated state
      user.essenceTap = state;
      await user.save();
    }

    const seq = getNextSequence(userId);

    socket.emit('state_full', {
      ...state,
      offlineProgress: offlineProgress.essenceEarned > 0 ? offlineProgress : null,
      seq,
      serverTimestamp: now
    });
  } catch (err) {
    console.error('[EssenceTap WS] Sync request error:', err);
    socket.emit('error', {
      code: 'SYNC_ERROR',
      message: 'Failed to sync state'
    });
  }
}

/**
 * Handle ping from client
 */
function handlePing(socket) {
  socket.emit('pong', { timestamp: Date.now() });
}

module.exports = {
  handleSyncRequest,
  handlePing
};
