/**
 * Essence Tap WebSocket Handler
 *
 * Provides real-time synchronization for the Essence Tap clicker minigame.
 * Handles tap batching, state reconciliation, and multi-tab synchronization.
 */

const jwt = require('jsonwebtoken');
const { User, UserCharacter, sequelize } = require('../models');
const essenceTapService = require('../services/essenceTapService');

// ===========================================
// CONFIGURATION
// ===========================================

const CONFIG = {
  // Batching configuration
  TAP_BATCH_WINDOW_MS: 100,        // Aggregate taps within this window
  MAX_TAPS_PER_BATCH: 25,          // Max taps per batch (matches rate limit)

  // Connection management
  HEARTBEAT_INTERVAL_MS: 30000,    // Ping every 30 seconds
  HEARTBEAT_TIMEOUT_MS: 10000,     // Disconnect if no pong in 10 seconds
  MAX_CONNECTIONS_PER_USER: 3,     // Multi-tab support

  // Rate limiting
  TAP_RATE_LIMIT_WINDOW_MS: 1000,  // 1 second window
  MAX_TAPS_PER_SECOND: 25,         // Maximum taps per second

  // Sync intervals
  FULL_SYNC_INTERVAL_MS: 60000,    // Full state sync every 60 seconds
};

// ===========================================
// STATE MANAGEMENT
// ===========================================

// Track user connections (userId -> Set of socket IDs)
const userConnections = new Map();

// Track pending tap batches (userId -> { taps: number, timer: NodeJS.Timeout, seq: number })
const pendingTapBatches = new Map();

// Track tap rate limiting (userId -> { count: number, windowStart: number })
const tapRateLimits = new Map();

// Track sequence numbers for ordering (userId -> number)
const userSequences = new Map();

// Track confirmed sequences (userId -> number)
const confirmedSequences = new Map();

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Verify JWT token and get user
 */
async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user?.id || decoded.userId;
    if (!userId) return null;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'username']
    });
    return user;
  } catch (err) {
    console.error('[EssenceTap WS] Token verification error:', err.message);
    return null;
  }
}

/**
 * Check tap rate limit
 */
function checkTapRateLimit(userId, tapCount) {
  const now = Date.now();
  const limit = tapRateLimits.get(userId);

  if (!limit || now - limit.windowStart >= CONFIG.TAP_RATE_LIMIT_WINDOW_MS) {
    tapRateLimits.set(userId, { count: tapCount, windowStart: now });
    return { allowed: true, remaining: CONFIG.MAX_TAPS_PER_SECOND - tapCount };
  }

  const newCount = limit.count + tapCount;
  if (newCount > CONFIG.MAX_TAPS_PER_SECOND) {
    return {
      allowed: false,
      remaining: Math.max(0, CONFIG.MAX_TAPS_PER_SECOND - limit.count),
      resetIn: CONFIG.TAP_RATE_LIMIT_WINDOW_MS - (now - limit.windowStart)
    };
  }

  limit.count = newCount;
  return { allowed: true, remaining: CONFIG.MAX_TAPS_PER_SECOND - newCount };
}

/**
 * Get next sequence number for a user
 */
function getNextSequence(userId) {
  const current = userSequences.get(userId) || 0;
  const next = current + 1;
  userSequences.set(userId, next);
  return next;
}

/**
 * Broadcast to all of a user's connections
 */
function broadcastToUser(namespace, userId, event, data) {
  const connections = userConnections.get(userId);
  if (!connections) return;

  for (const socketId of connections) {
    const socket = namespace.sockets.get(socketId);
    if (socket) {
      socket.emit(event, data);
    }
  }
}

/**
 * Calculate passive gains since last update
 */
function calculatePassiveGains(state, characters, maxSeconds = 300) {
  const now = Date.now();
  const lastUpdate = state.lastOnlineTimestamp || state.lastSaveTimestamp || now;
  const elapsedMs = now - lastUpdate;
  const elapsedSeconds = Math.min(elapsedMs / 1000, maxSeconds);

  if (elapsedSeconds <= 0) {
    return { gains: 0, newTimestamp: now };
  }

  const activeAbilityEffects = essenceTapService.getActiveAbilityEffects(state);
  let productionPerSecond = essenceTapService.calculateProductionPerSecond(state, characters);
  if (activeAbilityEffects.productionMultiplier) {
    productionPerSecond *= activeAbilityEffects.productionMultiplier;
  }

  const passiveGain = Math.floor(productionPerSecond * elapsedSeconds);
  return { gains: passiveGain, newTimestamp: now };
}

/**
 * Process batched taps atomically
 */
async function processTapBatch(userId, tapCount, comboMultiplier, namespace) {
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(userId, { transaction, lock: true });
    if (!user) {
      await transaction.rollback();
      return { success: false, error: 'User not found' };
    }

    let state = user.essenceTap || essenceTapService.getInitialState();
    state = essenceTapService.resetDaily(state);

    // Get characters for bonus calculation
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: userId },
      include: ['Character'],
      transaction
    });

    const characters = userCharacters.map(uc => ({
      id: uc.CharacterId,
      rarity: uc.Character?.rarity || 'common',
      element: uc.Character?.element || 'neutral'
    }));

    // Apply passive gains
    const passiveResult = calculatePassiveGains(state, characters);
    if (passiveResult.gains > 0) {
      state.essence = (state.essence || 0) + passiveResult.gains;
      state.lifetimeEssence = (state.lifetimeEssence || 0) + passiveResult.gains;
      state = essenceTapService.updateWeeklyProgress(state, passiveResult.gains);
    }

    // Get active ability effects
    const activeAbilityEffects = essenceTapService.getActiveAbilityEffects(state);

    // Process clicks
    let totalEssence = 0;
    let totalCrits = 0;
    let goldenClicks = 0;

    for (let i = 0; i < tapCount; i++) {
      const result = essenceTapService.processClick(state, characters, comboMultiplier, activeAbilityEffects);
      totalEssence += result.essenceGained;
      if (result.isCrit) totalCrits++;
      if (result.isGolden) goldenClicks++;
    }

    // Update state
    state.essence = (state.essence || 0) + totalEssence;
    state.lifetimeEssence = (state.lifetimeEssence || 0) + totalEssence;
    state.totalClicks = (state.totalClicks || 0) + tapCount;
    state.totalCrits = (state.totalCrits || 0) + totalCrits;

    // Update daily stats
    state.daily = state.daily || {};
    state.daily.clicks = (state.daily.clicks || 0) + tapCount;
    state.daily.crits = (state.daily.crits || 0) + totalCrits;
    state.daily.essenceEarned = (state.daily.essenceEarned || 0) + totalEssence;

    // Update golden clicks stats
    state.stats = state.stats || {};
    state.stats.goldenEssenceClicks = (state.stats.goldenEssenceClicks || 0) + goldenClicks;

    // Update weekly tournament progress
    state = essenceTapService.updateWeeklyProgress(state, totalEssence);

    // Update essence types
    const essenceTypeBreakdown = essenceTapService.classifyEssence(totalEssence, goldenClicks > 0, totalCrits > 0);
    state = essenceTapService.updateEssenceTypes(state, essenceTypeBreakdown);

    const now = Date.now();
    state.lastOnlineTimestamp = now;

    // Check for daily challenge completions
    const completedChallenges = essenceTapService.checkDailyChallenges(state);
    if (completedChallenges.length > 0) {
      state.daily.completedChallenges = [
        ...(state.daily.completedChallenges || []),
        ...completedChallenges.map(c => c.id)
      ];
    }

    // Save atomically
    user.essenceTap = state;
    user.lastEssenceTapRequest = now;
    await user.save({ transaction });
    await transaction.commit();

    // Get sequence number for this confirmation
    const seq = getNextSequence(userId);
    confirmedSequences.set(userId, seq);

    return {
      success: true,
      essence: state.essence,
      lifetimeEssence: state.lifetimeEssence,
      essenceGained: totalEssence,
      passiveGained: passiveResult.gains,
      crits: totalCrits,
      goldenClicks,
      totalClicks: state.totalClicks,
      completedChallenges,
      seq,
      serverTimestamp: now
    };
  } catch (err) {
    await transaction.rollback();
    console.error('[EssenceTap WS] Error processing tap batch:', err);
    return { success: false, error: 'Failed to process taps' };
  }
}

/**
 * Get full game state for sync
 */
async function getFullState(userId) {
  try {
    const user = await User.findByPk(userId);
    if (!user) return null;

    let state = user.essenceTap || essenceTapService.getInitialState();
    state = essenceTapService.resetDaily(state);
    state = essenceTapService.resetWeeklyFPIfNeeded(state);

    const userCharacters = await UserCharacter.findAll({
      where: { UserId: userId },
      include: ['Character']
    });

    const characters = userCharacters.map(uc => ({
      id: uc.CharacterId,
      rarity: uc.Character?.rarity || 'common',
      element: uc.Character?.element || 'neutral'
    }));

    // Apply passive gains
    const passiveResult = calculatePassiveGains(state, characters);
    if (passiveResult.gains > 0) {
      state.essence = (state.essence || 0) + passiveResult.gains;
      state.lifetimeEssence = (state.lifetimeEssence || 0) + passiveResult.gains;
      state = essenceTapService.updateWeeklyProgress(state, passiveResult.gains);
      state.lastOnlineTimestamp = passiveResult.newTimestamp;

      // Save the updated state
      user.essenceTap = state;
      user.lastEssenceTapRequest = passiveResult.newTimestamp;
      await user.save();
    }

    const gameState = essenceTapService.getGameState(state, characters);
    const seq = userSequences.get(userId) || 0;

    return {
      ...gameState,
      seq,
      serverTimestamp: Date.now()
    };
  } catch (err) {
    console.error('[EssenceTap WS] Error getting full state:', err);
    return null;
  }
}

// ===========================================
// SOCKET INITIALIZATION
// ===========================================

/**
 * Initialize Essence Tap WebSocket handlers
 * @param {import('socket.io').Server} io - Socket.IO server instance
 */
function initEssenceTapWebSocket(io) {
  const namespace = io.of('/essence-tap');

  // Authentication middleware
  namespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const user = await verifyToken(token);
      if (!user) {
        return next(new Error('Invalid token'));
      }

      // Check connection limit
      const connections = userConnections.get(user.id);
      if (connections && connections.size >= CONFIG.MAX_CONNECTIONS_PER_USER) {
        return next(new Error('Too many connections'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  namespace.on('connection', (socket) => {
    const userId = socket.user.id;
    const username = socket.user.username;

    console.log(`[EssenceTap WS] Player "${username}" connected`);

    // Track connection
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(socket.id);

    // Initialize sequence if needed
    if (!userSequences.has(userId)) {
      userSequences.set(userId, 0);
    }

    // Setup heartbeat
    let heartbeatTimer = null;
    let heartbeatTimeout = null;

    const startHeartbeat = () => {
      heartbeatTimer = setInterval(() => {
        socket.emit('ping');
        heartbeatTimeout = setTimeout(() => {
          console.log(`[EssenceTap WS] Player "${username}" heartbeat timeout`);
          socket.disconnect(true);
        }, CONFIG.HEARTBEAT_TIMEOUT_MS);
      }, CONFIG.HEARTBEAT_INTERVAL_MS);
    };

    socket.on('pong', () => {
      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = null;
      }
    });

    startHeartbeat();

    // Send initial state
    getFullState(userId).then(state => {
      if (state) {
        socket.emit('state_full', state);
      }
    });

    // ===========================================
    // TAP HANDLING WITH BATCHING
    // ===========================================

    socket.on('tap', async (data) => {
      const { count = 1, comboMultiplier = 1, clientSeq } = data;
      const tapCount = Math.min(Math.max(1, count), CONFIG.MAX_TAPS_PER_BATCH);

      // Rate limit check
      const rateCheck = checkTapRateLimit(userId, tapCount);
      if (!rateCheck.allowed) {
        socket.emit('error', {
          code: 'RATE_LIMITED',
          message: 'Tap rate limit exceeded',
          remaining: rateCheck.remaining,
          resetIn: rateCheck.resetIn
        });
        return;
      }

      // Get or create batch
      let batch = pendingTapBatches.get(userId);
      if (!batch) {
        batch = {
          taps: 0,
          comboMultiplier,
          timer: null,
          clientSeqs: [],
          startTime: Date.now()
        };
        pendingTapBatches.set(userId, batch);
      }

      // Add to batch
      batch.taps += tapCount;
      batch.comboMultiplier = Math.max(batch.comboMultiplier, comboMultiplier);
      if (clientSeq !== undefined) {
        batch.clientSeqs.push(clientSeq);
      }

      // Clear existing timer
      if (batch.timer) {
        clearTimeout(batch.timer);
      }

      // If batch is full or window exceeded, process immediately
      const shouldProcessNow = batch.taps >= CONFIG.MAX_TAPS_PER_BATCH ||
                               (Date.now() - batch.startTime) >= CONFIG.TAP_BATCH_WINDOW_MS * 2;

      if (shouldProcessNow) {
        const batchToProcess = { ...batch };
        pendingTapBatches.delete(userId);

        const result = await processTapBatch(userId, batchToProcess.taps, batchToProcess.comboMultiplier, namespace);

        if (result.success) {
          broadcastToUser(namespace, userId, 'tap_confirmed', {
            essence: result.essence,
            lifetimeEssence: result.lifetimeEssence,
            essenceGained: result.essenceGained,
            passiveGained: result.passiveGained,
            crits: result.crits,
            goldenClicks: result.goldenClicks,
            totalClicks: result.totalClicks,
            completedChallenges: result.completedChallenges,
            seq: result.seq,
            confirmedClientSeqs: batchToProcess.clientSeqs,
            serverTimestamp: result.serverTimestamp
          });
        } else {
          socket.emit('error', {
            code: 'TAP_FAILED',
            message: result.error,
            clientSeqs: batchToProcess.clientSeqs
          });
        }
      } else {
        // Set timer to process batch
        batch.timer = setTimeout(async () => {
          const batchToProcess = pendingTapBatches.get(userId);
          if (!batchToProcess) return;

          pendingTapBatches.delete(userId);

          const result = await processTapBatch(userId, batchToProcess.taps, batchToProcess.comboMultiplier, namespace);

          if (result.success) {
            broadcastToUser(namespace, userId, 'tap_confirmed', {
              essence: result.essence,
              lifetimeEssence: result.lifetimeEssence,
              essenceGained: result.essenceGained,
              passiveGained: result.passiveGained,
              crits: result.crits,
              goldenClicks: result.goldenClicks,
              totalClicks: result.totalClicks,
              completedChallenges: result.completedChallenges,
              seq: result.seq,
              confirmedClientSeqs: batchToProcess.clientSeqs,
              serverTimestamp: result.serverTimestamp
            });
          } else {
            broadcastToUser(namespace, userId, 'error', {
              code: 'TAP_FAILED',
              message: result.error,
              clientSeqs: batchToProcess.clientSeqs
            });
          }
        }, CONFIG.TAP_BATCH_WINDOW_MS);
      }
    });

    // ===========================================
    // SYNC REQUEST
    // ===========================================

    socket.on('sync_request', async () => {
      const state = await getFullState(userId);
      if (state) {
        socket.emit('state_full', state);
      } else {
        socket.emit('error', {
          code: 'SYNC_FAILED',
          message: 'Failed to get state'
        });
      }
    });

    // ===========================================
    // PURCHASE HANDLERS
    // ===========================================

    socket.on('purchase_generator', async (data) => {
      const { generatorId, count = 1, clientSeq } = data;

      if (!generatorId) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Generator ID required' });
        return;
      }

      // Process any pending taps first
      const pendingBatch = pendingTapBatches.get(userId);
      if (pendingBatch) {
        pendingTapBatches.delete(userId);
        if (pendingBatch.timer) clearTimeout(pendingBatch.timer);
        await processTapBatch(userId, pendingBatch.taps, pendingBatch.comboMultiplier, namespace);
      }

      try {
        const user = await User.findByPk(userId);
        if (!user) {
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'User not found',
            code: 'USER_NOT_FOUND'
          });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        // Get characters
        const userCharacters = await UserCharacter.findAll({
          where: { UserId: userId },
          include: ['Character']
        });

        const characters = userCharacters.map(uc => ({
          id: uc.CharacterId,
          rarity: uc.Character?.rarity || 'common',
          element: uc.Character?.element || 'neutral'
        }));

        // Apply passive gains
        const passiveResult = calculatePassiveGains(state, characters);
        if (passiveResult.gains > 0) {
          state.essence = (state.essence || 0) + passiveResult.gains;
          state.lifetimeEssence = (state.lifetimeEssence || 0) + passiveResult.gains;
          state = essenceTapService.updateWeeklyProgress(state, passiveResult.gains);
        }

        const result = essenceTapService.purchaseGenerator(state, generatorId, count);

        if (!result.success) {
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: 'PURCHASE_FAILED',
            correctState: { essence: state.essence }
          });
          return;
        }

        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;

        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
        await user.save();

        const seq = getNextSequence(userId);
        const gameState = essenceTapService.getGameState(result.newState, characters);

        // Broadcast to all tabs
        broadcastToUser(namespace, userId, 'state_delta', {
          essence: result.newState.essence,
          generators: result.newState.generators,
          productionPerSecond: gameState.productionPerSecond,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        console.error('[EssenceTap WS] Purchase generator error:', err);
        socket.emit('error', { code: 'PURCHASE_ERROR', message: 'Purchase failed' });
      }
    });

    socket.on('purchase_upgrade', async (data) => {
      const { upgradeId, clientSeq } = data;

      if (!upgradeId) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Upgrade ID required' });
        return;
      }

      // Process any pending taps first
      const pendingBatch = pendingTapBatches.get(userId);
      if (pendingBatch) {
        pendingTapBatches.delete(userId);
        if (pendingBatch.timer) clearTimeout(pendingBatch.timer);
        await processTapBatch(userId, pendingBatch.taps, pendingBatch.comboMultiplier, namespace);
      }

      try {
        const user = await User.findByPk(userId);
        if (!user) {
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        const userCharacters = await UserCharacter.findAll({
          where: { UserId: userId },
          include: ['Character']
        });

        const characters = userCharacters.map(uc => ({
          id: uc.CharacterId,
          rarity: uc.Character?.rarity || 'common',
          element: uc.Character?.element || 'neutral'
        }));

        // Apply passive gains
        const passiveResult = calculatePassiveGains(state, characters);
        if (passiveResult.gains > 0) {
          state.essence = (state.essence || 0) + passiveResult.gains;
          state.lifetimeEssence = (state.lifetimeEssence || 0) + passiveResult.gains;
        }

        const result = essenceTapService.purchaseUpgrade(state, upgradeId);

        if (!result.success) {
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            correctState: { essence: state.essence }
          });
          return;
        }

        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;

        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
        await user.save();

        const seq = getNextSequence(userId);
        const gameState = essenceTapService.getGameState(result.newState, characters);

        broadcastToUser(namespace, userId, 'state_delta', {
          essence: result.newState.essence,
          purchasedUpgrades: result.newState.purchasedUpgrades,
          clickPower: gameState.clickPower,
          productionPerSecond: gameState.productionPerSecond,
          critChance: gameState.critChance,
          critMultiplier: gameState.critMultiplier,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        console.error('[EssenceTap WS] Purchase upgrade error:', err);
        socket.emit('error', { code: 'PURCHASE_ERROR', message: 'Purchase failed' });
      }
    });

    // ===========================================
    // DISCONNECT HANDLING
    // ===========================================

    socket.on('disconnect', () => {
      console.log(`[EssenceTap WS] Player "${username}" disconnected`);

      // Clean up heartbeat
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (heartbeatTimeout) clearTimeout(heartbeatTimeout);

      // Remove from user connections
      const connections = userConnections.get(userId);
      if (connections) {
        connections.delete(socket.id);
        if (connections.size === 0) {
          userConnections.delete(userId);

          // Process any remaining batch before cleanup
          const pendingBatch = pendingTapBatches.get(userId);
          if (pendingBatch) {
            if (pendingBatch.timer) clearTimeout(pendingBatch.timer);
            processTapBatch(userId, pendingBatch.taps, pendingBatch.comboMultiplier, namespace);
            pendingTapBatches.delete(userId);
          }
        }
      }
    });
  });

  // Periodic cleanup
  setInterval(() => {
    const now = Date.now();

    // Clean up old rate limit entries
    for (const [userId, data] of tapRateLimits.entries()) {
      if (now - data.windowStart > CONFIG.TAP_RATE_LIMIT_WINDOW_MS * 10) {
        tapRateLimits.delete(userId);
      }
    }
  }, 60000);

  console.log('[EssenceTap WS] WebSocket handler initialized');
  return namespace;
}

module.exports = { initEssenceTapWebSocket };
