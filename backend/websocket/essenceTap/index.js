/**
 * Essence Tap WebSocket Handler
 *
 * Main entry point for the Essence Tap WebSocket namespace.
 * Uses the handler factory pattern to eliminate boilerplate code.
 */

const handlers = require('./handlers');
const { getUserRoom } = require('./utils/broadcast');
const { resetSequence } = require('./utils/sequence');

/**
 * Set up the Essence Tap WebSocket namespace
 * @param {Object} io - Socket.io server instance
 */
function setupEssenceTapSocket(io) {
  const namespace = io.of('/essence-tap');

  namespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify token and attach user ID
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (_err) {
      next(new Error('Invalid token'));
    }
  });

  namespace.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`[EssenceTap WS] User ${userId} connected`);

    // Join user-specific room for broadcasts
    socket.join(getUserRoom(userId));

    // Register all handlers using the factory pattern
    const handlerMap = {
      // Core
      'tap': (s, uid, ns, data) => handlers.handleTap(s, uid, ns, data),
      'sync_request': (s, uid, ns) => handlers.handleSyncRequest(s, uid, ns),
      'ping': (s) => handlers.handlePing(s),

      // Purchases
      'purchase_generator': (s, uid, ns, data) => handlers.handlePurchaseGenerator(s, uid, ns, data),
      'purchase_upgrade': (s, uid, ns, data) => handlers.handlePurchaseUpgrade(s, uid, ns, data),

      // Prestige
      'prestige': (s, uid, ns, data) => handlers.handlePrestige(s, uid, ns, data),
      'purchase_prestige_upgrade': (s, uid, ns, data) => handlers.handlePurchasePrestigeUpgrade(s, uid, ns, data),

      // Abilities
      'activate_ability': (s, uid, ns, data) => handlers.handleActivateAbility(s, uid, ns, data),

      // Gambling & Infusion
      'gamble': (s, uid, ns, data) => handlers.handleGamble(s, uid, ns, data),
      'infusion': (s, uid, ns, data) => handlers.handleInfusion(s, uid, ns, data),

      // Boss
      'spawn_boss': (s, uid, ns, data) => handlers.handleSpawnBoss(s, uid, ns, data),
      'attack_boss': (s, uid, ns, data) => handlers.handleAttackBoss(s, uid, ns, data),
      'claim_boss_reward': (s, uid, ns, data) => handlers.handleClaimBossReward(s, uid, ns, data),

      // Challenges & Milestones
      'claim_daily_challenge': (s, uid, ns, data) => handlers.handleClaimDailyChallenge(s, uid, ns, data),
      'claim_milestone': (s, uid, ns, data) => handlers.handleClaimMilestone(s, uid, ns, data),
      'claim_repeatable_milestone': (s, uid, ns, data) => handlers.handleClaimRepeatableMilestone(s, uid, ns, data),
      'claim_session_milestone': (s, uid, ns, data) => handlers.handleClaimSessionMilestone(s, uid, ns, data),

      // Tournament
      'claim_tournament_rewards': (s, uid, ns, data) => handlers.handleClaimTournamentRewards(s, uid, ns, data),
      'claim_tournament_checkpoint': (s, uid, ns, data) => handlers.handleClaimTournamentCheckpoint(s, uid, ns, data),
      'claim_daily_streak': (s, uid, ns, data) => handlers.handleClaimDailyStreak(s, uid, ns, data),

      // Characters
      'assign_character': (s, uid, ns, data) => handlers.handleAssignCharacter(s, uid, ns, data),
      'unassign_character': (s, uid, ns, data) => handlers.handleUnassignCharacter(s, uid, ns, data)
    };

    // Register each handler
    for (const [event, handler] of Object.entries(handlerMap)) {
      socket.on(event, (data) => handler(socket, userId, namespace, data));
    }

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[EssenceTap WS] User ${userId} disconnected: ${reason}`);
      // Don't reset sequence on temporary disconnects
      if (reason === 'transport close' || reason === 'ping timeout') {
        // Keep sequence for potential reconnection
      } else {
        resetSequence(userId);
      }
    });

    // Send initial sync
    handlers.handleSyncRequest(socket, userId, namespace);
  });

  return namespace;
}

module.exports = {
  setupEssenceTapSocket
};
