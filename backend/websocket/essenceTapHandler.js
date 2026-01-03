/**
 * Essence Tap WebSocket Handler
 *
 * Provides real-time synchronization for the Essence Tap clicker minigame.
 * Handles tap batching, state reconciliation, and multi-tab synchronization.
 *
 * NOTE: Many handlers in this file duplicate logic from REST routes.
 * New handlers should use the unified action handlers from:
 *   - ../services/essenceTap/actions - Pure action handlers
 *   - ./essenceTapActions.js - WebSocket-specific wrappers
 *
 * See essenceTapActions.js for examples of how to refactor handlers.
 */

const jwt = require('jsonwebtoken');
const { User, UserCharacter, sequelize } = require('../models');
const essenceTapService = require('../services/essenceTapService');
const { actions } = require('../services/essenceTap');
const shared = require('../services/essenceTap/shared');
const { GAME_CONFIG } = require('../config/essenceTap');

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

  // Combo validation - max multiplier from game config (default 2.5)
  MAX_COMBO_MULTIPLIER: GAME_CONFIG.comboMaxMultiplier || 2.5
};

// ===========================================
// STATE MANAGEMENT
// ===========================================

// Track user connections (userId -> Set of socket IDs)
const userConnections = new Map();

// Track pending tap batches (userId -> { taps: number, timer: NodeJS.Timeout, seq: number })
const pendingTapBatches = new Map();

// BUG #1 FIX: Track batch processing locks to prevent race conditions
// When a batch is being processed, new taps are queued until processing completes
const batchProcessingLocks = new Map(); // userId -> Promise<void>

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
 * BUG #1 FIX: Acquire batch processing lock to prevent race conditions
 * Multiple tabs sending taps simultaneously could previously clobber each other
 */
async function acquireBatchLock(userId) {
  // Wait for any existing batch processing to complete
  const existingLock = batchProcessingLocks.get(userId);
  if (existingLock) {
    try {
      await existingLock;
    } catch {
      // Ignore errors from previous batch, we still need to proceed
    }
  }

  // Create our lock promise
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  batchProcessingLocks.set(userId, promise);

  return () => {
    resolve();
    // Clean up lock after a brief delay to catch any immediately following requests
    setTimeout(() => {
      const current = batchProcessingLocks.get(userId);
      if (current === promise) {
        batchProcessingLocks.delete(userId);
      }
    }, 50);
  };
}

/**
 * Process batched taps atomically
 * BUG #1 FIX: Now uses batch lock to prevent race conditions
 */
async function processTapBatch(userId, tapCount, comboMultiplier, _namespace) {
  // Acquire lock to prevent race conditions with concurrent tab submissions
  const releaseLock = await acquireBatchLock(userId);

  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(userId, { transaction, lock: true });
    if (!user) {
      await transaction.rollback();
      releaseLock();
      return { success: false, error: 'User not found' };
    }

    let state = user.essenceTap || essenceTapService.getInitialState();
    state = essenceTapService.resetDaily(state);
    state = essenceTapService.resetWeeklyFPIfNeeded(state);

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

    // Check burning hour status for tournament bonus
    const burningHourStatus = essenceTapService.getBurningHourStatus();
    const burningHourActive = burningHourStatus?.isActive || false;

    // Apply passive gains
    const passiveResult = calculatePassiveGains(state, characters);
    if (passiveResult.gains > 0) {
      state.essence = (state.essence || 0) + passiveResult.gains;
      state.lifetimeEssence = (state.lifetimeEssence || 0) + passiveResult.gains;
      const weeklyResult = essenceTapService.updateWeeklyProgress(state, passiveResult.gains, {
        burningHourActive
      });
      state = weeklyResult.newState;
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

    // Update session stats for mini-milestones
    if (!state.sessionStats) {
      state.sessionStats = {
        sessionStartTime: Date.now(),
        sessionEssence: 0,
        currentCombo: 0,
        maxCombo: 0,
        critStreak: 0,
        maxCritStreak: 0,
        claimedSessionMilestones: [],
        claimedComboMilestones: [],
        claimedCritMilestones: []
      };
    }
    if (!state.sessionStats.sessionStartTime) {
      state.sessionStats.sessionStartTime = Date.now();
    }

    // Track session essence
    state.sessionStats.sessionEssence = (state.sessionStats.sessionEssence || 0) + totalEssence;

    // Derive combo count from multiplier and track max combo
    // comboMultiplier = 1 + (comboCount * 0.08), so comboCount = (comboMultiplier - 1) / 0.08
    const comboGrowthRate = GAME_CONFIG.comboGrowthRate || 0.08;
    const derivedComboCount = Math.round((comboMultiplier - 1) / comboGrowthRate);
    if (derivedComboCount > 0) {
      state.sessionStats.currentCombo = derivedComboCount;
      if (derivedComboCount > (state.sessionStats.maxCombo || 0)) {
        state.sessionStats.maxCombo = derivedComboCount;
      }
    }

    // Track crit streak - for batch taps, we need to handle mixed crit/non-crit batches
    // Since we can't know the order of crits in a batch, we use a conservative approach:
    // - If all taps were crits, add them all to the streak
    // - If there were some crits but not all, add the crits first then reset
    //   (this gives credit for the crits before the streak breaks)
    if (totalCrits === tapCount && tapCount > 0) {
      // All crits - extend the streak
      state.sessionStats.critStreak = (state.sessionStats.critStreak || 0) + totalCrits;
      if (state.sessionStats.critStreak > (state.sessionStats.maxCritStreak || 0)) {
        state.sessionStats.maxCritStreak = state.sessionStats.critStreak;
      }
    } else if (totalCrits > 0 && totalCrits < tapCount) {
      // Mixed batch - add crits to streak first, then reset
      // This ensures max streak is properly tracked even in mixed batches
      const newStreak = (state.sessionStats.critStreak || 0) + totalCrits;
      if (newStreak > (state.sessionStats.maxCritStreak || 0)) {
        state.sessionStats.maxCritStreak = newStreak;
      }
      // Then reset since we had non-crits
      state.sessionStats.critStreak = 0;
    } else if (totalCrits === 0 && tapCount > 0) {
      // No crits at all - reset streak
      state.sessionStats.critStreak = 0;
    }

    // Update weekly tournament progress with burning hour bonus if active
    const weeklyTournamentResult = essenceTapService.updateWeeklyProgress(state, totalEssence, {
      burningHourActive
    });
    state = weeklyTournamentResult.newState;

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

    // Update character mastery (track play time in hours)
    // Estimate hours based on session duration - roughly track active play sessions
    const sessionDurationMs = now - (state.sessionStats?.sessionStartTime || now);
    const sessionHours = Math.min(sessionDurationMs / (1000 * 60 * 60), 0.1); // Cap at 0.1 hours per batch to prevent abuse
    let masteryLevelUps = [];
    if (sessionHours > 0 && state.assignedCharacters?.length > 0) {
      const masteryResult = essenceTapService.updateCharacterMastery(state, sessionHours);
      state = masteryResult.newState;
      masteryLevelUps = masteryResult.levelUps || [];
    }

    // Save atomically
    user.essenceTap = state;
    user.lastEssenceTapRequest = now;
    await user.save({ transaction });
    await transaction.commit();

    // Get sequence number for this confirmation
    const seq = getNextSequence(userId);
    confirmedSequences.set(userId, seq);

    // BUG #1 FIX: Release lock after successful processing
    releaseLock();

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
      masteryLevelUps,
      seq,
      serverTimestamp: now
    };
  } catch (err) {
    await transaction.rollback();
    // BUG #1 FIX: Release lock on error
    releaseLock();
    console.error('[EssenceTap WS] Error processing tap batch:', err);
    return { success: false, error: 'Failed to process taps' };
  }
}

/**
 * Get full game state for sync
 * Uses transaction to ensure consistency when applying passive gains
 */
async function getFullState(userId) {
  const transaction = await sequelize.transaction();

  try {
    // Use row lock to prevent race conditions with other requests
    const user = await User.findByPk(userId, { transaction, lock: true });
    if (!user) {
      await transaction.rollback();
      return null;
    }

    let state = user.essenceTap || essenceTapService.getInitialState();
    state = essenceTapService.resetDaily(state);
    state = essenceTapService.resetWeeklyFPIfNeeded(state);

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

    // Check burning hour status for tournament bonus
    const burningHourStatus = essenceTapService.getBurningHourStatus();
    const burningHourActive = burningHourStatus?.isActive || false;

    // Apply passive gains
    const passiveResult = calculatePassiveGains(state, characters);
    if (passiveResult.gains > 0) {
      state.essence = (state.essence || 0) + passiveResult.gains;
      state.lifetimeEssence = (state.lifetimeEssence || 0) + passiveResult.gains;
      const weeklyResult = essenceTapService.updateWeeklyProgress(state, passiveResult.gains, {
        burningHourActive
      });
      state = weeklyResult.newState;
      state.lastOnlineTimestamp = passiveResult.newTimestamp;

      // Save the updated state atomically
      user.essenceTap = state;
      user.lastEssenceTapRequest = passiveResult.newTimestamp;
      await user.save({ transaction });
    }

    await transaction.commit();

    const gameState = essenceTapService.getGameState(state, characters);
    const seq = userSequences.get(userId) || 0;

    return {
      ...gameState,
      seq,
      serverTimestamp: Date.now()
    };
  } catch (err) {
    await transaction.rollback();
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
    } catch (_err) {
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
      // Support both single clientSeq and clientSeqs array for backward compatibility
      const { count = 1, comboMultiplier = 1, clientSeq, clientSeqs } = data;
      // SECURITY: Parse count as integer to prevent type coercion exploits (e.g., "Infinity", "25a")
      const tapCount = Math.min(Math.max(1, parseInt(count, 10) || 1), CONFIG.MAX_TAPS_PER_BATCH);
      // Normalize to array for consistent handling
      const incomingSeqs = clientSeqs || (clientSeq !== undefined ? [clientSeq] : []);

      // SECURITY: Validate and clamp combo multiplier to prevent exploitation
      // Combo multiplier must be between 1 and the configured max (default 2.5)
      const validatedComboMultiplier = Math.min(
        Math.max(1, Number(comboMultiplier) || 1),
        CONFIG.MAX_COMBO_MULTIPLIER
      );

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
          comboMultiplier: validatedComboMultiplier,
          timer: null,
          clientSeqs: [],
          startTime: Date.now()
        };
        pendingTapBatches.set(userId, batch);
      }

      // Add to batch
      batch.taps += tapCount;
      // Use validated multiplier, take max of current batch and incoming (both already validated)
      batch.comboMultiplier = Math.max(batch.comboMultiplier, validatedComboMultiplier);
      // Add all incoming sequence numbers to the batch
      if (incomingSeqs.length > 0) {
        batch.clientSeqs.push(...incomingSeqs);
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
            masteryLevelUps: result.masteryLevelUps,
            seq: result.seq,
            confirmedClientSeqs: batchToProcess.clientSeqs,
            serverTimestamp: result.serverTimestamp
          });

          // Emit separate mastery level-up events for each character that leveled up
          if (result.masteryLevelUps && result.masteryLevelUps.length > 0) {
            for (const levelUp of result.masteryLevelUps) {
              broadcastToUser(namespace, userId, 'mastery_level_up', {
                characterId: levelUp.characterId,
                oldLevel: levelUp.oldLevel,
                newLevel: levelUp.newLevel,
                unlockedAbility: levelUp.unlockedAbility,
                serverTimestamp: result.serverTimestamp
              });
            }
          }
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
              masteryLevelUps: result.masteryLevelUps,
              seq: result.seq,
              confirmedClientSeqs: batchToProcess.clientSeqs,
              serverTimestamp: result.serverTimestamp
            });

            // Emit separate mastery level-up events for each character that leveled up
            if (result.masteryLevelUps && result.masteryLevelUps.length > 0) {
              for (const levelUp of result.masteryLevelUps) {
                broadcastToUser(namespace, userId, 'mastery_level_up', {
                  characterId: levelUp.characterId,
                  oldLevel: levelUp.oldLevel,
                  newLevel: levelUp.newLevel,
                  unlockedAbility: levelUp.unlockedAbility,
                  serverTimestamp: result.serverTimestamp
                });
              }
            }
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

    socket.on('sync_request', async (data) => {
      // Log reason for debugging if provided
      if (data?.reason) {
        console.log(`[EssenceTap WS] Player "${username}" sync request: ${data.reason}`);
      }

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
    // VISIBILITY CHANGE HANDLERS
    // ===========================================

    socket.on('visibility_hidden', async (_data) => {
      // User's tab was hidden (alt+tab, minimize, switch tabs)
      // Save the current state and timestamp for offline calculation
      console.log(`[EssenceTap WS] Player "${username}" tab hidden`);

      // Process any pending taps before going idle
      const pendingBatch = pendingTapBatches.get(userId);
      if (pendingBatch) {
        pendingTapBatches.delete(userId);
        if (pendingBatch.timer) clearTimeout(pendingBatch.timer);
        await processTapBatch(userId, pendingBatch.taps, pendingBatch.comboMultiplier, namespace);
      }

      // Update lastOnlineTimestamp in database
      try {
        const user = await User.findByPk(userId);
        if (user) {
          let state = user.essenceTap || essenceTapService.getInitialState();
          state.lastOnlineTimestamp = Date.now();
          user.essenceTap = state;
          await user.save();
        }
      } catch (err) {
        console.error('[EssenceTap WS] Error saving visibility_hidden state:', err);
      }
    });

    socket.on('visibility_visible', async (data) => {
      // User's tab became visible again after being hidden
      const { hiddenDuration } = data || {};
      console.log(`[EssenceTap WS] Player "${username}" tab visible (hidden for ${Math.round((hiddenDuration || 0) / 1000)}s)`);

      // Get fresh state with offline earnings calculated
      const state = await getFullState(userId);
      if (state) {
        socket.emit('state_full', state);
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

      // Use transaction to prevent race conditions with concurrent purchases
      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
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
          const weeklyResult = essenceTapService.updateWeeklyProgress(state, passiveResult.gains);
          state = weeklyResult.newState;
        }

        const result = essenceTapService.purchaseGenerator(state, generatorId, count);

        if (!result.success) {
          await transaction.rollback();
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
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);
        const gameState = essenceTapService.getGameState(result.newState, characters);

        // Calculate next costs for each generator and max affordable
        const generatorCosts = {};
        const maxAffordable = {};
        const availableGenerators = essenceTapService.getAvailableGenerators(result.newState);
        for (const gen of availableGenerators) {
          const owned = result.newState.generators?.[gen.id] || 0;
          generatorCosts[gen.id] = essenceTapService.getGeneratorCost(gen.id, owned);
          maxAffordable[gen.id] = essenceTapService.getMaxPurchasable(gen.id, owned, result.newState.essence);
        }

        // Broadcast full relevant state to all tabs for proper multi-tab sync
        broadcastToUser(namespace, userId, 'state_delta', {
          essence: result.newState.essence,
          lifetimeEssence: result.newState.lifetimeEssence,
          generators: result.newState.generators,
          productionPerSecond: gameState.productionPerSecond,
          generatorCosts,
          maxAffordable,
          daily: {
            generatorsBought: result.newState.daily?.generatorsBought || 0
          },
          stats: {
            totalGeneratorsBought: result.newState.stats?.totalGeneratorsBought || 0
          },
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
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

      // Use transaction to prevent race conditions with concurrent purchases
      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

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
        }

        const result = essenceTapService.purchaseUpgrade(state, upgradeId);

        if (!result.success) {
          await transaction.rollback();
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
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);
        const gameState = essenceTapService.getGameState(result.newState, characters);

        // Get available upgrades with affordability info
        const availableUpgrades = essenceTapService.getAvailableUpgrades(result.newState).map(upgrade => ({
          id: upgrade.id,
          name: upgrade.name,
          cost: upgrade.cost,
          affordable: result.newState.essence >= upgrade.cost
        }));

        // Broadcast full relevant state to all tabs for proper multi-tab sync
        broadcastToUser(namespace, userId, 'state_delta', {
          essence: result.newState.essence,
          lifetimeEssence: result.newState.lifetimeEssence,
          purchasedUpgrades: result.newState.purchasedUpgrades,
          clickPower: gameState.clickPower,
          productionPerSecond: gameState.productionPerSecond,
          critChance: gameState.critChance,
          critMultiplier: gameState.critMultiplier,
          availableUpgrades,
          stats: {
            totalUpgradesPurchased: result.newState.stats?.totalUpgradesPurchased || 0
          },
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Purchase upgrade error:', err);
        socket.emit('error', { code: 'PURCHASE_ERROR', message: 'Purchase failed' });
      }
    });

    // ===========================================
    // PRESTIGE HANDLER
    // ===========================================

    socket.on('prestige', async (data) => {
      const { clientSeq } = data || {};

      // BUG #6 FIX: Acquire batch lock BEFORE starting transaction
      // This ensures pending taps are processed atomically with prestige
      const releaseLock = await acquireBatchLock(userId);

      // Use transaction for atomicity
      const transaction = await sequelize.transaction();

      try {
        // Get any pending taps (process within same transaction)
        const pendingBatch = pendingTapBatches.get(userId);
        if (pendingBatch) {
          pendingTapBatches.delete(userId);
          if (pendingBatch.timer) clearTimeout(pendingBatch.timer);
        }

        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          releaseLock();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        // BUG #6 FIX: Process pending taps within the same transaction
        if (pendingBatch && pendingBatch.taps > 0) {
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

          const activeAbilityEffects = essenceTapService.getActiveAbilityEffects(state);

          // Process clicks inline
          let totalEssence = 0;
          for (let i = 0; i < pendingBatch.taps; i++) {
            const clickResult = essenceTapService.processClick(
              state,
              characters,
              pendingBatch.comboMultiplier || 1,
              activeAbilityEffects
            );
            totalEssence += clickResult.essenceGained;
          }

          state.essence = (state.essence || 0) + totalEssence;
          state.lifetimeEssence = (state.lifetimeEssence || 0) + totalEssence;
          state.totalClicks = (state.totalClicks || 0) + pendingBatch.taps;
        }

        const result = essenceTapService.performPrestige(state, user);

        if (!result.success) {
          await transaction.rollback();
          releaseLock();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: 'PRESTIGE_FAILED'
          });
          return;
        }

        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;

        // Apply FP with cap enforcement
        let actualFP = 0;
        if (result.fatePointsReward > 0) {
          const fpResult = essenceTapService.applyFPWithCap(
            result.newState,
            result.fatePointsReward,
            'prestige'
          );
          result.newState = fpResult.newState;
          actualFP = fpResult.actualFP;
        }

        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;

        // Award Fate Points
        if (actualFP > 0) {
          const fatePoints = user.fatePoints || {};
          fatePoints.global = fatePoints.global || { points: 0 };
          fatePoints.global.points = (fatePoints.global.points || 0) + actualFP;
          user.fatePoints = fatePoints;
        }

        // Award XP
        if (result.xpReward > 0) {
          user.accountXP = (user.accountXP || 0) + result.xpReward;
        }

        await user.save({ transaction });
        await transaction.commit();
        releaseLock();

        const seq = getNextSequence(userId);

        // Get full state for broadcast
        const userCharacters = await UserCharacter.findAll({
          where: { UserId: userId },
          include: ['Character']
        });

        const characters = userCharacters.map(uc => ({
          id: uc.CharacterId,
          rarity: uc.Character?.rarity || 'common',
          element: uc.Character?.element || 'neutral'
        }));

        const gameState = essenceTapService.getGameState(result.newState, characters);

        // Broadcast prestige result to all tabs
        broadcastToUser(namespace, userId, 'prestige_complete', {
          ...gameState,
          shardsEarned: result.shardsEarned,
          totalShards: result.totalShards,
          prestigeLevel: result.prestigeLevel,
          fatePointsReward: actualFP,
          xpReward: result.xpReward,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        releaseLock();
        console.error('[EssenceTap WS] Prestige error:', err);
        socket.emit('error', { code: 'PRESTIGE_ERROR', message: 'Prestige failed' });
      }
    });

    // ===========================================
    // ABILITY ACTIVATION HANDLER
    // ===========================================

    socket.on('activate_ability', async (data) => {
      const { abilityId, clientSeq } = data;

      if (!abilityId) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Ability ID required' });
        return;
      }

      // Use transaction lock to prevent race conditions
      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();
        const result = essenceTapService.activateAbility(state, abilityId);

        if (!result.success) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: 'ABILITY_FAILED'
          });
          return;
        }

        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;

        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast ability activation to all tabs
        broadcastToUser(namespace, userId, 'ability_activated', {
          ability: result.ability,
          duration: result.duration,
          effects: result.effects,
          bonusEssence: result.bonusEssence,
          essence: result.newState.essence,
          activeAbilities: essenceTapService.getActiveAbilitiesInfo(result.newState),
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Ability activation error:', err);
        socket.emit('error', { code: 'ABILITY_ERROR', message: 'Ability activation failed' });
      }
    });

    // ===========================================
    // GAMBLE HANDLER
    // ===========================================

    // REFACTORED: Now uses unified action handler from services/essenceTap/actions
    socket.on('gamble', async (data) => {
      const { betType, betAmount, clientSeq } = data;

      if (!betType || betAmount === undefined) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Bet type and amount required' });
        return;
      }

      // Process any pending taps first
      const pendingBatch = pendingTapBatches.get(userId);
      if (pendingBatch) {
        pendingTapBatches.delete(userId);
        if (pendingBatch.timer) clearTimeout(pendingBatch.timer);
        await processTapBatch(userId, pendingBatch.taps, pendingBatch.comboMultiplier, namespace);
      }

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();
        state = essenceTapService.resetDaily(state);

        // Get characters for passive calculation
        const characters = await shared.loadUserCharacters(userId, { transaction });

        // Apply passive gains
        const passiveResult = calculatePassiveGains(state, characters);
        if (passiveResult.gains > 0) {
          state.essence = (state.essence || 0) + passiveResult.gains;
          state.lifetimeEssence = (state.lifetimeEssence || 0) + passiveResult.gains;
          const weeklyResult = essenceTapService.updateWeeklyProgress(state, passiveResult.gains);
          state = weeklyResult.newState;
          state.lastOnlineTimestamp = passiveResult.newTimestamp;
        }

        // Use unified action handler
        const result = await actions.performGamble({
          state,
          betAmount,
          betType,
          userId
        });

        if (!result.success) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: result.code || 'GAMBLE_FAILED'
          });
          return;
        }

        // Apply user changes (FP, tickets) from action result
        if (result.userChanges) {
          shared.applyUserChanges(user, result.userChanges);
        }

        const now = Date.now();
        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast gamble result to all tabs
        broadcastToUser(namespace, userId, 'gamble_result', {
          won: result.won,
          betAmount: result.betAmount,
          betType: result.betType,
          multiplier: result.multiplier,
          winChance: result.winChance,
          essenceChange: result.essenceChange,
          newEssence: result.newEssence,
          jackpotWin: result.jackpotWin,
          jackpotRewards: result.jackpotRewards,
          jackpotContribution: result.jackpotContribution,
          gambleInfo: result.gambleInfo,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Gamble error:', err);
        socket.emit('error', { code: 'GAMBLE_ERROR', message: 'Gamble failed' });
      }
    });

    // ===========================================
    // INFUSION HANDLER
    // ===========================================

    // REFACTORED: Now uses unified action handler from services/essenceTap/actions
    socket.on('infusion', async (data) => {
      const { clientSeq } = data;

      // Process any pending taps first
      const pendingBatch = pendingTapBatches.get(userId);
      if (pendingBatch) {
        pendingTapBatches.delete(userId);
        if (pendingBatch.timer) clearTimeout(pendingBatch.timer);
        await processTapBatch(userId, pendingBatch.taps, pendingBatch.comboMultiplier, namespace);
      }

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        // Get characters for passive calculation
        const characters = await shared.loadUserCharacters(userId, { transaction });

        // Apply passive gains
        const passiveResult = calculatePassiveGains(state, characters);
        if (passiveResult.gains > 0) {
          state.essence = (state.essence || 0) + passiveResult.gains;
          state.lifetimeEssence = (state.lifetimeEssence || 0) + passiveResult.gains;
          const weeklyResult = essenceTapService.updateWeeklyProgress(state, passiveResult.gains);
          state = weeklyResult.newState;
          state.lastOnlineTimestamp = passiveResult.newTimestamp;
        }

        // Use unified action handler
        const result = actions.performInfusion({ state });

        if (!result.success) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: result.code || 'INFUSION_FAILED'
          });
          return;
        }

        const now = Date.now();
        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast infusion result to all tabs
        broadcastToUser(namespace, userId, 'infusion_complete', {
          cost: result.cost,
          costPercent: result.costPercent,
          bonusGained: result.bonusGained,
          totalBonus: result.totalBonus,
          infusionCount: result.infusionCount,
          nextCost: actions.getInfusionInfo(result.newState).nextCost,
          essence: result.essence,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Infusion error:', err);
        socket.emit('error', { code: 'INFUSION_ERROR', message: 'Infusion failed' });
      }
    });

    // ===========================================
    // CHARACTER ASSIGNMENT HANDLERS
    // ===========================================

    socket.on('assign_character', async (data) => {
      const { characterId, clientSeq } = data;

      if (!characterId) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Character ID required' });
        return;
      }

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();
        state = essenceTapService.resetDaily(state);

        // Get user's owned characters
        const userCharacters = await UserCharacter.findAll({
          where: { UserId: userId },
          include: ['Character'],
          transaction
        });

        const ownedCharacters = userCharacters.map(uc => ({
          id: uc.CharacterId,
          characterId: uc.CharacterId,
          rarity: uc.Character?.rarity || 'common',
          element: uc.Character?.element || 'neutral',
          series: uc.Character?.series || ''
        }));

        const result = essenceTapService.assignCharacter(state, characterId, ownedCharacters);

        if (!result.success) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: 'ASSIGN_FAILED'
          });
          return;
        }

        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;

        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Calculate updated bonuses with new character
        const characters = ownedCharacters;
        const gameState = essenceTapService.getGameState(result.newState, characters);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'character_assigned', {
          characterId,
          assignedCharacters: result.newState.assignedCharacters,
          characterBonus: gameState.characterBonus,
          elementBonuses: gameState.elementBonuses,
          elementSynergy: gameState.elementSynergy,
          seriesSynergy: gameState.seriesSynergy,
          masteryBonus: gameState.masteryBonus,
          clickPower: gameState.clickPower,
          productionPerSecond: gameState.productionPerSecond,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Assign character error:', err);
        socket.emit('error', { code: 'ASSIGN_ERROR', message: 'Failed to assign character' });
      }
    });

    socket.on('unassign_character', async (data) => {
      const { characterId, clientSeq } = data;

      if (!characterId) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Character ID required' });
        return;
      }

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        const result = essenceTapService.unassignCharacter(state, characterId);

        if (!result.success) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: 'UNASSIGN_FAILED'
          });
          return;
        }

        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;

        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Get characters for bonus calculation
        const userCharacters = await UserCharacter.findAll({
          where: { UserId: userId },
          include: ['Character']
        });

        const characters = userCharacters.map(uc => ({
          id: uc.CharacterId,
          rarity: uc.Character?.rarity || 'common',
          element: uc.Character?.element || 'neutral',
          series: uc.Character?.series || ''
        }));

        const gameState = essenceTapService.getGameState(result.newState, characters);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'character_unassigned', {
          characterId,
          assignedCharacters: result.newState.assignedCharacters,
          characterBonus: gameState.characterBonus,
          elementBonuses: gameState.elementBonuses,
          elementSynergy: gameState.elementSynergy,
          seriesSynergy: gameState.seriesSynergy,
          masteryBonus: gameState.masteryBonus,
          clickPower: gameState.clickPower,
          productionPerSecond: gameState.productionPerSecond,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Unassign character error:', err);
        socket.emit('error', { code: 'UNASSIGN_ERROR', message: 'Failed to unassign character' });
      }
    });

    // ===========================================
    // DAILY CHALLENGE CLAIM HANDLER
    // ===========================================

    socket.on('claim_daily_challenge', async (data) => {
      const { challengeId, clientSeq } = data;

      if (!challengeId) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Challenge ID required' });
        return;
      }

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();
        state = essenceTapService.resetDaily(state);

        // Check if challenge is completed but not claimed
        const completedChallenges = state.daily?.completedChallenges || [];
        const claimedChallenges = state.daily?.claimedChallenges || [];

        if (!completedChallenges.includes(challengeId)) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'Challenge not completed',
            code: 'CHALLENGE_NOT_COMPLETED'
          });
          return;
        }

        if (claimedChallenges.includes(challengeId)) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'Challenge already claimed',
            code: 'ALREADY_CLAIMED'
          });
          return;
        }

        // Find the challenge config to get reward
        const { DAILY_CHALLENGES } = require('../config/essenceTap');
        const challenge = DAILY_CHALLENGES.find(c => c.id === challengeId);
        if (!challenge) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'Invalid challenge',
            code: 'INVALID_CHALLENGE'
          });
          return;
        }

        // Apply reward
        const newState = { ...state };
        newState.daily = { ...state.daily };
        newState.daily.claimedChallenges = [...claimedChallenges, challengeId];

        // Award essence bonus if applicable
        if (challenge.reward?.essence) {
          newState.essence = (state.essence || 0) + challenge.reward.essence;
          newState.lifetimeEssence = (state.lifetimeEssence || 0) + challenge.reward.essence;
        }

        const now = Date.now();
        newState.lastOnlineTimestamp = now;

        user.essenceTap = newState;
        user.lastEssenceTapRequest = now;

        // Award FP if applicable (with weekly cap)
        let fatePointsAwarded = 0;
        if (challenge.reward?.fatePoints) {
          const fpResult = essenceTapService.applyFPWithCap(newState, challenge.reward.fatePoints, 'daily_challenge');
          user.essenceTap = fpResult.newState;
          fatePointsAwarded = fpResult.actualFP;

          if (fatePointsAwarded > 0) {
            const fatePoints = user.fatePoints || {};
            fatePoints.global = fatePoints.global || { points: 0 };
            fatePoints.global.points = (fatePoints.global.points || 0) + fatePointsAwarded;
            user.fatePoints = fatePoints;
          }
        }

        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'daily_challenge_claimed', {
          challengeId,
          challenge: {
            id: challenge.id,
            name: challenge.name,
            type: challenge.type
          },
          reward: challenge.reward,
          fatePointsAwarded,
          essence: user.essenceTap.essence,
          claimedChallenges: newState.daily.claimedChallenges,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Claim daily challenge error:', err);
        socket.emit('error', { code: 'CLAIM_ERROR', message: 'Failed to claim challenge' });
      }
    });

    // ===========================================
    // PRESTIGE UPGRADE HANDLER
    // ===========================================

    socket.on('purchase_prestige_upgrade', async (data) => {
      const { upgradeId, clientSeq } = data;

      if (!upgradeId) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Upgrade ID required' });
        return;
      }

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        const result = essenceTapService.purchasePrestigeUpgrade(state, upgradeId);

        if (!result.success) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: 'PRESTIGE_UPGRADE_FAILED'
          });
          return;
        }

        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;

        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Get updated prestige info
        const prestigeInfo = essenceTapService.getPrestigeInfo(result.newState);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'prestige_upgrade_purchased', {
          upgradeId,
          upgrade: result.upgrade,
          newLevel: result.newLevel,
          cost: result.cost,
          prestigeShards: result.newState.prestigeShards,
          prestigeUpgrades: result.newState.prestigeUpgrades,
          prestige: prestigeInfo,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Purchase prestige upgrade error:', err);
        socket.emit('error', { code: 'PRESTIGE_UPGRADE_ERROR', message: 'Failed to purchase upgrade' });
      }
    });

    // ===========================================
    // MILESTONE CLAIM HANDLERS
    // ===========================================

    // REFACTORED: Now uses unified action handler from services/essenceTap/actions
    socket.on('claim_milestone', async (data) => {
      const { milestoneKey, clientSeq } = data;

      if (!milestoneKey) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Milestone key required' });
        return;
      }

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        const state = user.essenceTap || essenceTapService.getInitialState();

        // Use unified action handler
        const result = actions.claimMilestone({ state, milestoneKey });

        if (!result.success) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: result.code || 'MILESTONE_FAILED'
          });
          return;
        }

        const now = Date.now();
        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;

        // Apply user changes (FP)
        if (result.userChanges) {
          shared.applyUserChanges(user, result.userChanges);
        }

        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'milestone_claimed', {
          milestoneKey,
          fatePoints: result.fatePoints,
          capped: result.capped,
          claimedMilestones: result.claimedMilestones,
          claimableMilestones: actions.checkMilestones(result.newState),
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Claim milestone error:', err);
        socket.emit('error', { code: 'MILESTONE_ERROR', message: 'Failed to claim milestone' });
      }
    });

    socket.on('claim_repeatable_milestone', async (data) => {
      const { milestoneType, clientSeq } = data;

      if (!milestoneType) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Milestone type required' });
        return;
      }

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();
        state = essenceTapService.resetWeeklyFPIfNeeded(state);

        const result = essenceTapService.claimRepeatableMilestone(state, milestoneType);

        if (!result.success) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: 'REPEATABLE_MILESTONE_FAILED'
          });
          return;
        }

        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;

        // Apply FP with cap
        const fpResult = essenceTapService.applyFPWithCap(result.newState, result.fatePoints, 'repeatable_milestone');
        result.newState = fpResult.newState;
        const actualFP = fpResult.actualFP;

        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;

        // Award FP
        if (actualFP > 0) {
          const fatePoints = user.fatePoints || {};
          fatePoints.global = fatePoints.global || { points: 0 };
          fatePoints.global.points = (fatePoints.global.points || 0) + actualFP;
          user.fatePoints = fatePoints;
        }

        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'repeatable_milestone_claimed', {
          milestoneType,
          fatePoints: actualFP,
          count: result.count || 1,
          capped: fpResult.capped,
          repeatableMilestones: result.newState.repeatableMilestones,
          claimableRepeatableMilestones: essenceTapService.checkRepeatableMilestones(result.newState),
          weeklyFP: essenceTapService.getWeeklyFPBudget(result.newState),
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Claim repeatable milestone error:', err);
        socket.emit('error', { code: 'REPEATABLE_MILESTONE_ERROR', message: 'Failed to claim milestone' });
      }
    });

    // ===========================================
    // WEEKLY TOURNAMENT HANDLERS
    // ===========================================

    socket.on('claim_tournament_rewards', async (data) => {
      const { clientSeq } = data || {};

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        // Check if rewards are available
        const tournamentInfo = essenceTapService.getWeeklyTournamentInfo(state);
        if (!tournamentInfo.canClaimRewards) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'No tournament rewards available to claim',
            code: 'NO_REWARDS'
          });
          return;
        }

        // Get rewards for the tier
        const { WEEKLY_TOURNAMENT } = require('../config/essenceTap');
        const tierRewards = WEEKLY_TOURNAMENT.tiers[tournamentInfo.tier];
        if (!tierRewards) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'Invalid tier',
            code: 'INVALID_TIER'
          });
          return;
        }

        // Mark rewards as claimed
        const newState = { ...state };
        newState.weekly = { ...state.weekly, rewardsClaimed: true };

        const now = Date.now();
        newState.lastOnlineTimestamp = now;

        // Apply FP with cap
        const fpResult = essenceTapService.applyFPWithCap(newState, tierRewards.fatePoints, 'tournament');
        user.essenceTap = fpResult.newState;
        const actualFP = fpResult.actualFP;

        // Award FP
        if (actualFP > 0) {
          const fatePoints = user.fatePoints || {};
          fatePoints.global = fatePoints.global || { points: 0 };
          fatePoints.global.points = (fatePoints.global.points || 0) + actualFP;
          user.fatePoints = fatePoints;
        }

        // Award roll tickets
        if (tierRewards.rollTickets > 0) {
          user.rollTickets = (user.rollTickets || 0) + tierRewards.rollTickets;
        }

        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'tournament_rewards_claimed', {
          tier: tournamentInfo.tier,
          rewards: {
            fatePoints: actualFP,
            rollTickets: tierRewards.rollTickets,
            capped: fpResult.capped
          },
          weeklyTournament: essenceTapService.getWeeklyTournamentInfo(user.essenceTap),
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Claim tournament rewards error:', err);
        socket.emit('error', { code: 'TOURNAMENT_ERROR', message: 'Failed to claim tournament rewards' });
      }
    });

    socket.on('claim_tournament_checkpoint', async (data) => {
      const { day, clientSeq } = data;

      if (day === undefined) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Checkpoint day required' });
        return;
      }

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        // Get checkpoint config
        const { WEEKLY_TOURNAMENT } = require('../config/essenceTap');
        const checkpoint = WEEKLY_TOURNAMENT.checkpoints?.find(cp => cp.day === day);
        if (!checkpoint) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'Invalid checkpoint',
            code: 'INVALID_CHECKPOINT'
          });
          return;
        }

        // Check if checkpoint is already claimed
        const claimedCheckpoints = state.weekly?.claimedCheckpoints || [];
        if (claimedCheckpoints.includes(day)) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'Checkpoint already claimed',
            code: 'ALREADY_CLAIMED'
          });
          return;
        }

        // Check if checkpoint requirements are met
        const weeklyEssence = state.weekly?.essenceEarned || 0;
        if (weeklyEssence < checkpoint.essenceRequired) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'Checkpoint requirements not met',
            code: 'REQUIREMENTS_NOT_MET'
          });
          return;
        }

        // Claim checkpoint
        const newState = { ...state };
        newState.weekly = {
          ...state.weekly,
          claimedCheckpoints: [...claimedCheckpoints, day]
        };

        const now = Date.now();
        newState.lastOnlineTimestamp = now;

        // Apply FP with cap
        const fpResult = essenceTapService.applyFPWithCap(newState, checkpoint.rewards.fatePoints || 0, 'checkpoint');
        user.essenceTap = fpResult.newState;
        const actualFP = fpResult.actualFP;

        // Award FP
        if (actualFP > 0) {
          const fatePoints = user.fatePoints || {};
          fatePoints.global = fatePoints.global || { points: 0 };
          fatePoints.global.points = (fatePoints.global.points || 0) + actualFP;
          user.fatePoints = fatePoints;
        }

        // Award roll tickets
        if (checkpoint.rewards.rollTickets > 0) {
          user.rollTickets = (user.rollTickets || 0) + checkpoint.rewards.rollTickets;
        }

        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'tournament_checkpoint_claimed', {
          day,
          checkpointName: checkpoint.name,
          rewards: {
            fatePoints: actualFP,
            rollTickets: checkpoint.rewards.rollTickets || 0,
            capped: fpResult.capped
          },
          claimedCheckpoints: newState.weekly.claimedCheckpoints,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Claim tournament checkpoint error:', err);
        socket.emit('error', { code: 'CHECKPOINT_ERROR', message: 'Failed to claim checkpoint' });
      }
    });

    // ===========================================
    // TICKET STREAK CLAIM HANDLER
    // ===========================================

    socket.on('claim_daily_streak', async (data) => {
      const { clientSeq } = data || {};

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();
        state = essenceTapService.resetDaily(state);

        // Check streak eligibility
        const today = new Date().toISOString().split('T')[0];
        const lastStreakDate = state.ticketGeneration?.lastStreakDate;

        if (lastStreakDate === today) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'Already claimed streak today',
            code: 'ALREADY_CLAIMED'
          });
          return;
        }

        // Calculate streak
        const newState = { ...state };
        newState.ticketGeneration = { ...state.ticketGeneration };

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastStreakDate === yesterdayStr) {
          // Continue streak
          newState.ticketGeneration.dailyStreakDays = (state.ticketGeneration?.dailyStreakDays || 0) + 1;
        } else {
          // Reset streak
          newState.ticketGeneration.dailyStreakDays = 1;
        }

        newState.ticketGeneration.lastStreakDate = today;

        // Award tickets based on streak
        const { TICKET_GENERATION } = require('../config/essenceTap');
        const streakDays = newState.ticketGeneration.dailyStreakDays;
        let ticketsAwarded = 0;

        // Check streak milestones
        for (const milestone of TICKET_GENERATION.streakMilestones || []) {
          if (streakDays === milestone.days) {
            ticketsAwarded = milestone.tickets;
            break;
          }
        }

        const now = Date.now();
        newState.lastOnlineTimestamp = now;

        user.essenceTap = newState;
        user.lastEssenceTapRequest = now;

        if (ticketsAwarded > 0) {
          user.rollTickets = (user.rollTickets || 0) + ticketsAwarded;
        }

        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'daily_streak_claimed', {
          streakDays,
          ticketsAwarded,
          awarded: ticketsAwarded > 0,
          ticketGeneration: newState.ticketGeneration,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Claim daily streak error:', err);
        socket.emit('error', { code: 'STREAK_ERROR', message: 'Failed to claim streak' });
      }
    });

    // ===========================================
    // SESSION MILESTONE CLAIM HANDLER
    // ===========================================

    socket.on('claim_session_milestone', async (data) => {
      const { milestoneType, milestoneName, clientSeq } = data;

      if (!milestoneType || !milestoneName) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Milestone type and name required' });
        return;
      }

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        // Get session stats
        const sessionStats = state.sessionStats || {};
        let claimedList;
        let milestoneConfig;

        const { MINI_MILESTONES } = require('../config/essenceTap');

        switch (milestoneType) {
          case 'session':
            claimedList = sessionStats.claimedSessionMilestones || [];
            milestoneConfig = MINI_MILESTONES.sessionMilestones?.find(m => m.name === milestoneName);
            break;
          case 'combo':
            claimedList = sessionStats.claimedComboMilestones || [];
            milestoneConfig = MINI_MILESTONES.comboMilestones?.find(m => m.name === milestoneName);
            break;
          case 'critStreak':
            claimedList = sessionStats.claimedCritMilestones || [];
            milestoneConfig = MINI_MILESTONES.critStreakMilestones?.find(m => m.name === milestoneName);
            break;
          default:
            await transaction.rollback();
            socket.emit('action_rejected', {
              clientSeq,
              reason: 'Invalid milestone type',
              code: 'INVALID_TYPE'
            });
            return;
        }

        if (!milestoneConfig) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'Invalid milestone',
            code: 'INVALID_MILESTONE'
          });
          return;
        }

        if (claimedList.includes(milestoneName)) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'Milestone already claimed',
            code: 'ALREADY_CLAIMED'
          });
          return;
        }

        // Apply reward
        const newState = { ...state };
        newState.sessionStats = { ...sessionStats };

        switch (milestoneType) {
          case 'session':
            newState.sessionStats.claimedSessionMilestones = [...claimedList, milestoneName];
            break;
          case 'combo':
            newState.sessionStats.claimedComboMilestones = [...claimedList, milestoneName];
            break;
          case 'critStreak':
            newState.sessionStats.claimedCritMilestones = [...claimedList, milestoneName];
            break;
        }

        // Award essence bonus
        if (milestoneConfig.reward?.essence) {
          newState.essence = (state.essence || 0) + milestoneConfig.reward.essence;
          newState.lifetimeEssence = (state.lifetimeEssence || 0) + milestoneConfig.reward.essence;
        }

        const now = Date.now();
        newState.lastOnlineTimestamp = now;

        user.essenceTap = newState;
        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'session_milestone_claimed', {
          milestoneType,
          milestoneName,
          reward: milestoneConfig.reward,
          essence: newState.essence,
          sessionStats: essenceTapService.getSessionStats(newState),
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Claim session milestone error:', err);
        socket.emit('error', { code: 'SESSION_MILESTONE_ERROR', message: 'Failed to claim milestone' });
      }
    });

    // ===========================================
    // BOSS ENCOUNTER HANDLERS
    // ===========================================

    socket.on('spawn_boss', async (data) => {
      const { clientSeq } = data || {};

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        const result = essenceTapService.spawnBoss(state);

        if (!result.success) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: 'BOSS_SPAWN_FAILED',
            cooldownRemaining: result.cooldownRemaining,
            clicksUntilSpawn: result.clicksUntilSpawn
          });
          return;
        }

        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;

        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'boss_spawned', {
          boss: result.boss,
          currentHealth: result.newState.bossEncounter.currentHealth,
          maxHealth: result.newState.bossEncounter.maxHealth,
          expiresAt: result.newState.bossEncounter.expiresAt,
          timeLimit: result.boss.timeLimit,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Spawn boss error:', err);
        socket.emit('error', { code: 'BOSS_SPAWN_ERROR', message: 'Failed to spawn boss' });
      }
    });

    socket.on('attack_boss', async (data) => {
      const { damage, clientSeq } = data;

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        // Get characters for damage calculation
        const userCharacters = await UserCharacter.findAll({
          where: { UserId: userId },
          include: ['Character'],
          transaction
        });

        const characters = userCharacters.map(uc => ({
          id: uc.CharacterId,
          characterId: uc.CharacterId,
          rarity: uc.Character?.rarity || 'common',
          element: uc.Character?.element || 'neutral'
        }));

        const result = essenceTapService.attackBoss(state, damage, characters);

        if (!result.success) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: 'BOSS_ATTACK_FAILED'
          });
          return;
        }

        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;

        // If boss was defeated, apply rewards
        if (result.defeated && result.rewards) {
          // Add essence rewards
          if (result.rewards.essence > 0) {
            result.newState.essence = (result.newState.essence || 0) + result.rewards.essence;
            result.newState.lifetimeEssence = (result.newState.lifetimeEssence || 0) + result.rewards.essence;
          }

          // Add prismatic essence
          if (result.rewards.prismaticEssence > 0) {
            result.newState.essenceTypes = {
              ...result.newState.essenceTypes,
              prismatic: (result.newState.essenceTypes?.prismatic || 0) + result.rewards.prismaticEssence
            };
          }

          // Award Fate Points
          if (result.rewards.fatePoints > 0) {
            const fpResult = essenceTapService.applyFPWithCap(result.newState, result.rewards.fatePoints, 'boss');
            result.newState = fpResult.newState;

            if (fpResult.actualFP > 0) {
              const fatePoints = user.fatePoints || {};
              fatePoints.global = fatePoints.global || { points: 0 };
              fatePoints.global.points = (fatePoints.global.points || 0) + fpResult.actualFP;
              user.fatePoints = fatePoints;
            }
          }

          // Award roll tickets
          if (result.rewards.rollTickets > 0) {
            user.rollTickets = (user.rollTickets || 0) + result.rewards.rollTickets;
          }

          // Award XP
          if (result.rewards.xp > 0) {
            user.accountXP = (user.accountXP || 0) + result.rewards.xp;
          }
        }

        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        if (result.defeated) {
          // Broadcast boss defeated
          broadcastToUser(namespace, userId, 'boss_defeated', {
            damageDealt: result.damageDealt,
            rewards: result.rewards,
            essence: result.newState.essence,
            lifetimeEssence: result.newState.lifetimeEssence,
            nextBossIn: result.nextBossIn,
            bossEncounter: essenceTapService.getBossEncounterInfo(result.newState),
            seq,
            confirmedClientSeq: clientSeq,
            serverTimestamp: now
          });
        } else if (result.bossSpawned) {
          // A new boss was spawned during attack
          broadcastToUser(namespace, userId, 'boss_spawned', {
            boss: result.boss,
            currentHealth: result.bossHealth,
            maxHealth: result.newState.bossEncounter.maxHealth,
            expiresAt: result.newState.bossEncounter.expiresAt,
            seq,
            confirmedClientSeq: clientSeq,
            serverTimestamp: now
          });
        } else {
          // Normal damage dealt
          broadcastToUser(namespace, userId, 'boss_damage_dealt', {
            damageDealt: result.damageDealt,
            bossHealth: result.bossHealth,
            timeRemaining: result.timeRemaining,
            seq,
            confirmedClientSeq: clientSeq,
            serverTimestamp: now
          });
        }
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Attack boss error:', err);
        socket.emit('error', { code: 'BOSS_ATTACK_ERROR', message: 'Failed to attack boss' });
      }
    });

    socket.on('get_boss_status', async (data) => {
      const { clientSeq } = data || {};

      try {
        const user = await User.findByPk(userId);
        if (!user) {
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        const state = user.essenceTap || essenceTapService.getInitialState();
        const bossInfo = essenceTapService.getBossEncounterInfo(state);

        socket.emit('boss_status', {
          ...bossInfo,
          confirmedClientSeq: clientSeq,
          serverTimestamp: Date.now()
        });
      } catch (err) {
        console.error('[EssenceTap WS] Get boss status error:', err);
        socket.emit('error', { code: 'BOSS_STATUS_ERROR', message: 'Failed to get boss status' });
      }
    });

    // ===========================================
    // BURNING HOUR HANDLER
    // ===========================================

    socket.on('get_burning_hour_status', async (data) => {
      const { clientSeq } = data || {};

      try {
        const burningHourStatus = essenceTapService.getBurningHourStatus();

        socket.emit('burning_hour_status', {
          ...burningHourStatus,
          confirmedClientSeq: clientSeq,
          serverTimestamp: Date.now()
        });
      } catch (err) {
        console.error('[EssenceTap WS] Get burning hour status error:', err);
        socket.emit('error', { code: 'BURNING_HOUR_ERROR', message: 'Failed to get burning hour status' });
      }
    });

    // ===========================================
    // TICKET EXCHANGE HANDLER
    // ===========================================

    socket.on('exchange_fp_for_tickets', async (data) => {
      const { clientSeq } = data || {};

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        // Get user's current fate points
        const userFP = user.fatePoints?.global?.points || 0;

        const result = essenceTapService.exchangeFatePointsForTickets(state, userFP);

        if (!result.success) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: result.error,
            code: 'EXCHANGE_FAILED'
          });
          return;
        }

        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;

        // Deduct fate points
        const fatePoints = user.fatePoints || {};
        fatePoints.global = fatePoints.global || { points: 0 };
        fatePoints.global.points = Math.max(0, (fatePoints.global.points || 0) - result.fatePointsCost);
        user.fatePoints = fatePoints;

        // Add roll tickets
        user.rollTickets = (user.rollTickets || 0) + result.ticketsReceived;

        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'tickets_exchanged', {
          fatePointsCost: result.fatePointsCost,
          ticketsReceived: result.ticketsReceived,
          exchangesRemaining: result.exchangesRemaining,
          newFatePoints: fatePoints.global.points,
          newRollTickets: user.rollTickets,
          ticketGeneration: result.newState.ticketGeneration,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Exchange FP for tickets error:', err);
        socket.emit('error', { code: 'EXCHANGE_ERROR', message: 'Failed to exchange' });
      }
    });

    // ===========================================
    // SWAP CHARACTER HANDLER (Atomic swap)
    // ===========================================

    socket.on('swap_character', async (data) => {
      const { oldCharacterId, newCharacterId, clientSeq } = data;

      if (!oldCharacterId || !newCharacterId) {
        socket.emit('error', { code: 'INVALID_REQUEST', message: 'Both character IDs required' });
        return;
      }

      const transaction = await sequelize.transaction();

      try {
        const user = await User.findByPk(userId, { transaction, lock: true });
        if (!user) {
          await transaction.rollback();
          socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
          return;
        }

        let state = user.essenceTap || essenceTapService.getInitialState();

        // Get user's owned characters
        const userCharacters = await UserCharacter.findAll({
          where: { UserId: userId },
          include: ['Character'],
          transaction
        });

        const ownedCharacters = userCharacters.map(uc => ({
          id: uc.CharacterId,
          characterId: uc.CharacterId,
          rarity: uc.Character?.rarity || 'common',
          element: uc.Character?.element || 'neutral',
          series: uc.Character?.series || ''
        }));

        // Check old character is assigned
        if (!state.assignedCharacters?.includes(oldCharacterId)) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'Old character not assigned',
            code: 'NOT_ASSIGNED'
          });
          return;
        }

        // Check new character is owned
        if (!ownedCharacters.find(c => c.id === newCharacterId)) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'New character not owned',
            code: 'NOT_OWNED'
          });
          return;
        }

        // Check new character isn't already assigned
        if (state.assignedCharacters?.includes(newCharacterId)) {
          await transaction.rollback();
          socket.emit('action_rejected', {
            clientSeq,
            reason: 'New character already assigned',
            code: 'ALREADY_ASSIGNED'
          });
          return;
        }

        // Perform atomic swap
        const newState = { ...state };
        newState.assignedCharacters = state.assignedCharacters.map(
          id => id === oldCharacterId ? newCharacterId : id
        );

        const now = Date.now();
        newState.lastOnlineTimestamp = now;

        user.essenceTap = newState;
        user.lastEssenceTapRequest = now;
        await user.save({ transaction });
        await transaction.commit();

        const seq = getNextSequence(userId);

        // Calculate updated bonuses
        const gameState = essenceTapService.getGameState(newState, ownedCharacters);

        // Broadcast to all user tabs
        broadcastToUser(namespace, userId, 'character_swapped', {
          oldCharacterId,
          newCharacterId,
          assignedCharacters: newState.assignedCharacters,
          characterBonus: gameState.characterBonus,
          elementBonuses: gameState.elementBonuses,
          elementSynergy: gameState.elementSynergy,
          seriesSynergy: gameState.seriesSynergy,
          masteryBonus: gameState.masteryBonus,
          clickPower: gameState.clickPower,
          productionPerSecond: gameState.productionPerSecond,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      } catch (err) {
        await transaction.rollback();
        console.error('[EssenceTap WS] Swap character error:', err);
        socket.emit('error', { code: 'SWAP_ERROR', message: 'Failed to swap character' });
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
