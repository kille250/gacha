/**
 * Essence Tap Routes
 *
 * API endpoints for the Essence Tap clicker minigame.
 *
 * REFACTORED: Now uses unified action handlers from services/essenceTap/actions/
 * to eliminate duplication with WebSocket handlers.
 *
 * The legacy essenceTapService is deprecated - all new code should use:
 * - actions.* for business logic
 * - stateService.* for state management
 * - shared.* for utilities
 * - calculations.* for pure computation functions
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { rewardClaimLimiter } = require('../middleware/rateLimiter');
const { User, UserCharacter, sequelize } = require('../models');
const accountLevelService = require('../services/accountLevelService');

// Modular essence tap imports (preferred)
const actions = require('../services/essenceTap/actions');
const shared = require('../services/essenceTap/shared');
const stateService = require('../services/essenceTap/stateService');
const calculations = require('../services/essenceTap/calculations');

// Config imports - use directly instead of via legacy service
const {
  GAME_CONFIG,
  CHARACTER_MASTERY,
  ESSENCE_TYPES,
  SERIES_SYNERGIES,
  WEEKLY_FP_CAP,
  MINI_MILESTONES,
  RANK_REWARDS,
  BRACKET_SYSTEM,
  BURNING_HOURS,
  TOURNAMENT_COSMETICS,
  CHARACTER_ABILITIES,
  ELEMENT_SYNERGIES,
  DAILY_MODIFIERS,
  DAILY_CHALLENGES,
  PRESTIGE_CONFIG
} = require('../config/essenceTap');

// Legacy service - DEPRECATED, use actions/stateService/calculations instead
// TODO: These functions still need migration to new modules:
// - essenceTapService.classifyEssence
// - essenceTapService.updateEssenceTypes
// - essenceTapService.getEssenceTypeBonuses
const essenceTapService = require('../services/essenceTapService');

// ===========================================
// SERVER-SIDE RATE LIMITING
// ===========================================

/**
 * In-memory rate limiter for click requests
 * Tracks last click timestamp and click count per user
 */
const clickRateLimiter = new Map();
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second window
const MAX_CLICKS_PER_WINDOW = 25; // Slightly higher than client-side to account for network batching
const RATE_LIMIT_CLEANUP_INTERVAL = 60000; // Clean up old entries every minute

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of clickRateLimiter.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS * 10) {
      clickRateLimiter.delete(userId);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

// ===========================================
// REQUEST DEDUPLICATION FOR PASSIVE GAINS
// ===========================================

/**
 * Tracks pending essence-modifying requests per user to prevent race conditions.
 * This prevents double-counting of passive gains when /status and /save are called
 * within milliseconds of each other (e.g., tab visibility change + auto-save timer).
 */
const pendingEssenceRequests = new Map();
const PASSIVE_GAIN_DEDUP_WINDOW_MS = 1000; // Window to deduplicate passive gain calculations

/**
 * Wrapper to serialize essence-modifying requests per user.
 * Prevents race conditions where multiple endpoints try to apply passive gains simultaneously.
 *
 * @param {number} userId - User ID
 * @param {Function} handler - Async handler function
 * @returns {Promise} Handler result
 */
async function withEssenceLock(userId, handler) {
  const key = `essence_${userId}`;
  const existing = pendingEssenceRequests.get(key);

  if (existing) {
    // Wait for previous request to complete before starting ours
    try {
      await existing.promise;
    } catch {
      // Ignore errors from previous request, we still need to proceed
    }
  }

  // Create our promise and store it
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  pendingEssenceRequests.set(key, { promise, timestamp: Date.now() });

  try {
    return await handler();
  } finally {
    resolve();
    // Clean up after a delay to allow any immediately following requests to see our entry
    setTimeout(() => {
      const current = pendingEssenceRequests.get(key);
      if (current && current.promise === promise) {
        pendingEssenceRequests.delete(key);
      }
    }, PASSIVE_GAIN_DEDUP_WINDOW_MS);
  }
}

// Clean up stale dedup entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of pendingEssenceRequests.entries()) {
    if (now - data.timestamp > PASSIVE_GAIN_DEDUP_WINDOW_MS * 10) {
      pendingEssenceRequests.delete(key);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

// ===========================================
// BUG #3 & #8 FIX: INITIALIZATION DEDUPLICATION
// ===========================================

/**
 * Prevents multi-tab duplicate offline earnings and repeated initialization.
 * Caches recent /initialize results to return idempotently within a short window.
 */
const initializationCache = new Map();
const INITIALIZATION_DEDUP_WINDOW_MS = 5000; // 5 second window to deduplicate

/**
 * Check if this initialization can return a cached result.
 * Returns null if no cached result, or the cached response if we should deduplicate.
 *
 * @param {number} userId - User ID
 * @param {number} clientTimestamp - Client's timestamp for idempotency
 * @returns {Object|null} Cached response or null
 */
function getCachedInitialization(userId, clientTimestamp) {
  const key = `init_${userId}`;
  const cached = initializationCache.get(key);

  if (!cached) return null;

  // If cached result is too old, discard it
  if (Date.now() - cached.serverTimestamp > INITIALIZATION_DEDUP_WINDOW_MS) {
    initializationCache.delete(key);
    return null;
  }

  // If client timestamp is older than cached response, this is likely a
  // duplicate request from another tab or a retry - return cached result
  if (clientTimestamp && clientTimestamp <= cached.clientTimestamp) {
    return { ...cached.response, fromCache: true };
  }

  return null;
}

/**
 * Cache an initialization result for deduplication.
 *
 * @param {number} userId - User ID
 * @param {number} clientTimestamp - Client's timestamp
 * @param {Object} response - Response to cache
 */
function cacheInitialization(userId, clientTimestamp, response) {
  const key = `init_${userId}`;
  initializationCache.set(key, {
    clientTimestamp,
    serverTimestamp: Date.now(),
    response
  });

  // Schedule cleanup
  setTimeout(() => {
    const current = initializationCache.get(key);
    if (current && Date.now() - current.serverTimestamp > INITIALIZATION_DEDUP_WINDOW_MS) {
      initializationCache.delete(key);
    }
  }, INITIALIZATION_DEDUP_WINDOW_MS + 1000);
}

// Clean up stale initialization cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of initializationCache.entries()) {
    if (now - data.serverTimestamp > INITIALIZATION_DEDUP_WINDOW_MS * 2) {
      initializationCache.delete(key);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

/**
 * Check and update rate limit for a user
 * @param {number} userId - User ID
 * @param {number} clickCount - Number of clicks in this request
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
function checkClickRateLimit(userId, clickCount) {
  const now = Date.now();
  const userLimit = clickRateLimiter.get(userId);

  if (!userLimit || now - userLimit.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // New window
    clickRateLimiter.set(userId, {
      windowStart: now,
      clicks: clickCount
    });
    return {
      allowed: true,
      remaining: MAX_CLICKS_PER_WINDOW - clickCount,
      resetIn: RATE_LIMIT_WINDOW_MS
    };
  }

  // Same window - check if adding clicks would exceed limit
  const newTotal = userLimit.clicks + clickCount;
  if (newTotal > MAX_CLICKS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: Math.max(0, MAX_CLICKS_PER_WINDOW - userLimit.clicks),
      resetIn: RATE_LIMIT_WINDOW_MS - (now - userLimit.windowStart)
    };
  }

  // Update click count
  userLimit.clicks = newTotal;
  return {
    allowed: true,
    remaining: MAX_CLICKS_PER_WINDOW - newTotal,
    resetIn: RATE_LIMIT_WINDOW_MS - (now - userLimit.windowStart)
  };
}

/**
 * Helper function to calculate and apply passive essence gains since last update.
 * This ensures any API endpoint that returns essence values includes accumulated passive income.
 *
 * IMPORTANT: This function includes a timestamp guard to prevent double-counting.
 * The guard is now handled internally by the shared module.
 *
 * REFACTORED: Now uses actions.applyPassiveGains from the modular service.
 *
 * @param {Object} state - Current essence tap state
 * @param {Array} characters - User's characters with rarity/element info
 * @param {number} maxSeconds - Maximum seconds to credit (prevents exploits)
 * @returns {{ state: Object, gainsApplied: number }} Updated state and gains applied
 */
function applyPassiveGains(state, characters, maxSeconds = 300) {
  // Use the unified action handler which includes all ability/tournament logic
  return actions.applyPassiveGains({ state, characters, maxSeconds });
}

/**
 * GET /api/essence-tap/status
 * Get current clicker state and calculate offline progress
 *
 * REFACTORED: Now uses actions.getStatus for unified logic
 */
router.get('/status', auth, async (req, res) => {
  // Use essence lock to prevent race conditions with /save endpoint
  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Load user's characters for bonus calculation
      const characters = await shared.loadUserCharacters(user.id);

      // Get initial state
      const state = user.essenceTap || stateService.getInitialState();

      // Use unified status action
      const result = actions.getStatus({
        state,
        characters,
        lastApiRequestTime: user.lastEssenceTapRequest
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error, code: result.code });
      }

      // Update timestamps and save
      const now = Date.now();
      user.essenceTap = result.state;
      user.lastEssenceTapRequest = now;
      await user.save();

      res.json({
        ...result.gameState,
        offlineProgress: result.offlineProgress,
        weeklyFPBudget: result.weeklyFPBudget,
        sessionStats: result.sessionStats
      });
    } catch (error) {
      console.error('Error getting essence tap status:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });
});

/**
 * POST /api/essence-tap/click
 * Process click(s) and return result
 */
router.post('/click', auth, async (req, res) => {
  // Server-side rate limit check (do this BEFORE acquiring lock to avoid holding lock during 429)
  const { count = 1, comboMultiplier = 1 } = req.body;
  // SECURITY: Parse count as integer to prevent type coercion exploits (e.g., "Infinity", "25a")
  const requestedClicks = Math.min(Math.max(1, parseInt(count, 10) || 1), GAME_CONFIG.maxClicksPerSecond || 20);
  const rateLimit = checkClickRateLimit(req.user.id, requestedClicks);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      remaining: rateLimit.remaining,
      resetIn: rateLimit.resetIn
    });
  }

  // Use essence lock to prevent race conditions with /status, /save, and concurrent clicks
  // This ensures only one request modifies essence state at a time
  return withEssenceLock(req.user.id, async () => {
    try {
      // Use the allowed click count (may be less than requested if near limit)
      const clickCount = Math.min(requestedClicks, rateLimit.remaining + requestedClicks);

      const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || stateService.getInitialState();
    state = stateService.resetDaily(state);

    // Get user's characters for bonus calculation
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: user.id },
      include: ['Character']
    });

    const characters = userCharacters.map(uc => ({
      id: uc.CharacterId,
      rarity: uc.Character?.rarity || 'common',
      element: uc.Character?.element || 'neutral'
    }));

    // Apply passive essence accumulated since last update
    // This ensures clicking doesn't cause essence to drop when frontend has accumulated passive income
    const passiveResult = applyPassiveGains(state, characters);
    state = passiveResult.state;

    // Get active ability effects
    const activeAbilityEffects = actions.getActiveAbilityEffects({ state });

    // Process clicks using unified action
    const tapResult = actions.processTaps({
      state,
      characters,
      count: clickCount,
      comboMultiplier,
      activeAbilityEffects
    });

    // Extract results from tap action
    state = tapResult.newState;
    const totalEssence = tapResult.essenceEarned;
    const totalCrits = tapResult.critCount;
    const goldenClicks = tapResult.goldenCount;

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
    const derivedComboCount = Math.round((comboMultiplier - 1) / (GAME_CONFIG.comboGrowthRate || 0.08));
    if (derivedComboCount > 0) {
      state.sessionStats.currentCombo = derivedComboCount;
      if (derivedComboCount > (state.sessionStats.maxCombo || 0)) {
        state.sessionStats.maxCombo = derivedComboCount;
      }
    }

    // Track crit streak - for batch clicks, we need to handle mixed crit/non-crit batches
    // Since we can't know the order of crits in a batch, we use a conservative approach:
    // - If all clicks were crits, add them all to the streak
    // - If there were some crits but not all, add the crits first then reset
    //   (this gives credit for the crits before the streak breaks)
    if (totalCrits === clickCount && clickCount > 0) {
      // All crits - extend the streak
      state.sessionStats.critStreak = (state.sessionStats.critStreak || 0) + totalCrits;
      if (state.sessionStats.critStreak > (state.sessionStats.maxCritStreak || 0)) {
        state.sessionStats.maxCritStreak = state.sessionStats.critStreak;
      }
    } else if (totalCrits > 0 && totalCrits < clickCount) {
      // Mixed batch - add crits to streak first, then reset
      // This ensures max streak is properly tracked even in mixed batches
      const newStreak = (state.sessionStats.critStreak || 0) + totalCrits;
      if (newStreak > (state.sessionStats.maxCritStreak || 0)) {
        state.sessionStats.maxCritStreak = newStreak;
      }
      // Then reset since we had non-crits
      state.sessionStats.critStreak = 0;
    } else if (totalCrits === 0 && clickCount > 0) {
      // No crits at all - reset streak
      state.sessionStats.critStreak = 0;
    }

    // Update weekly tournament progress with burning hour check
    const burningHourStatus = actions.getBurningHourStatus();
    const weeklyTournamentResult = actions.updateWeeklyProgress({
      state,
      essence: totalEssence,
      options: { burningHourActive: burningHourStatus?.active }
    });
    state = weeklyTournamentResult.newState || state;

    // Classify and track essence types
    // Note: For batch clicks, we use last click's golden status for simplicity
    const essenceTypeBreakdown = essenceTapService.classifyEssence(totalEssence, goldenClicks > 0, totalCrits > 0);
    state = essenceTapService.updateEssenceTypes(state, essenceTypeBreakdown);

    const now = Date.now();
    state.lastOnlineTimestamp = now;

    // Check for new daily challenge completions
    const completedChallenges = actions.checkDailyChallenges({ state });

    // Mark completed challenges as done so they don't trigger again
    if (completedChallenges.length > 0) {
      state.daily.completedChallenges = [
        ...(state.daily.completedChallenges || []),
        ...completedChallenges.map(c => c.id)
      ];
    }

    // Save
    user.essenceTap = state;
    // Update lastEssenceTapRequest to prevent /status from adding duplicate passive gains
    user.lastEssenceTapRequest = now;
    await user.save();

    res.json({
      essenceGained: totalEssence,
      essence: state.essence,
      lifetimeEssence: state.lifetimeEssence,
      crits: totalCrits,
      goldenClicks,
      totalClicks: state.totalClicks,
      essenceTypes: essenceTypeBreakdown,
      completedChallenges: completedChallenges.length > 0 ? completedChallenges : undefined
    });
    } catch (error) {
      console.error('Error processing click:', error);
      res.status(500).json({ error: 'Failed to process click' });
    }
  });
});

/**
 * POST /api/essence-tap/generator/buy
 * Purchase generator(s)
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/generator/buy', auth, async (req, res) => {
  const { generatorId, count = 1 } = req.body;

  if (!generatorId) {
    return res.status(400).json({ error: 'Generator ID required' });
  }

  // Use essence lock to prevent race conditions with concurrent requests
  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let state = user.essenceTap || stateService.getInitialState();

      // Get user's characters for passive calculation
      const userCharacters = await UserCharacter.findAll({
        where: { UserId: user.id },
        include: ['Character']
      });

      const characters = userCharacters.map(uc => ({
        id: uc.CharacterId,
        rarity: uc.Character?.rarity || 'common',
        element: uc.Character?.element || 'neutral'
      }));

      // Apply passive essence before purchase check
      const passiveResult = applyPassiveGains(state, characters);
      state = passiveResult.state;

      const result = actions.purchaseGenerator({ state, generatorId, count });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const now = Date.now();

      // Check for new daily challenge completions
      const completedChallenges = actions.checkDailyChallenges({ state: result.newState });

      // Mark completed challenges as done so they don't trigger again
      if (completedChallenges.length > 0) {
        result.newState.daily.completedChallenges = [
          ...(result.newState.daily.completedChallenges || []),
          ...completedChallenges.map(c => c.id)
        ];
      }

      user.essenceTap = result.newState;
      // Update lastEssenceTapRequest to prevent /status from adding duplicate passive gains
      user.lastEssenceTapRequest = now;
      await user.save();

      // Get updated game state (reuse characters from earlier fetch)
      const gameState = stateService.getGameState(result.newState, characters);

      res.json({
        success: true,
        generator: result.generator,
        newCount: result.newCount,
        cost: result.cost,
        productionPerSecond: gameState.productionPerSecond,
        essence: result.newState.essence,
        completedChallenges: completedChallenges.length > 0 ? completedChallenges : undefined
      });
    } catch (error) {
      console.error('Error purchasing generator:', error);
      res.status(500).json({ error: 'Failed to purchase generator' });
    }
  });
});

/**
 * POST /api/essence-tap/upgrade/buy
 * Purchase an upgrade
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/upgrade/buy', auth, async (req, res) => {
  const { upgradeId } = req.body;

  if (!upgradeId) {
    return res.status(400).json({ error: 'Upgrade ID required' });
  }

  // Use essence lock to prevent race conditions with concurrent requests
  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let state = user.essenceTap || stateService.getInitialState();

      // Get user's characters for passive calculation
      const userCharacters = await UserCharacter.findAll({
        where: { UserId: user.id },
        include: ['Character']
      });

      const characters = userCharacters.map(uc => ({
        id: uc.CharacterId,
        rarity: uc.Character?.rarity || 'common',
        element: uc.Character?.element || 'neutral'
      }));

      // Apply passive essence before purchase check
      const passiveResult = applyPassiveGains(state, characters);
      state = passiveResult.state;

      const result = actions.purchaseUpgrade({ state, upgradeId });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const now = Date.now();
      user.essenceTap = result.newState;
      // Update lastEssenceTapRequest to prevent /status from adding duplicate passive gains
      user.lastEssenceTapRequest = now;
      await user.save();

      // Award XP for upgrade purchase
      accountLevelService.addXP(user, GAME_CONFIG.xpPerUpgrade || 2, 'essence_tap_upgrade');
      await user.save();

      // Get updated game state (reuse characters from earlier fetch)
      const gameState = stateService.getGameState(result.newState, characters);

      res.json({
        success: true,
        upgrade: result.upgrade,
        clickPower: gameState.clickPower,
        productionPerSecond: gameState.productionPerSecond,
        critChance: gameState.critChance,
        critMultiplier: gameState.critMultiplier,
        essence: result.newState.essence
      });
    } catch (error) {
      console.error('Error purchasing upgrade:', error);
      res.status(500).json({ error: 'Failed to purchase upgrade' });
    }
  });
});

/**
 * POST /api/essence-tap/prestige
 * Perform prestige (awakening)
 */
router.post('/prestige', auth, async (req, res) => {
  // Use transaction to ensure atomicity when modifying user state and awarding FP/XP
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(req.user.id, { transaction, lock: true });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || stateService.getInitialState();

    const result = actions.performPrestige({ state, user });

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    const now = Date.now();
    result.newState.lastOnlineTimestamp = now;

    // Apply FP with cap enforcement (prestige counts toward weekly cap)
    let actualFP = 0;
    let fpCapped = false;
    if (result.fatePointsReward > 0) {
      const fpResult = actions.applyFPWithCap(
        result.newState,
        result.fatePointsReward,
        'prestige'
      );
      result.newState = fpResult.newState;
      actualFP = fpResult.actualFP;
      fpCapped = fpResult.capped;
    }

    user.essenceTap = result.newState;
    // Update lastEssenceTapRequest to prevent /status from adding duplicate passive gains
    user.lastEssenceTapRequest = now;

    // Award Fate Points (with cap applied)
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

    res.json({
      success: true,
      shardsEarned: result.shardsEarned,
      totalShards: result.totalShards,
      prestigeLevel: result.prestigeLevel,
      fatePointsReward: actualFP,
      fatePointsCapped: fpCapped,
      xpReward: result.xpReward,
      startingEssence: result.startingEssence
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error performing prestige:', error);
    res.status(500).json({ error: 'Failed to prestige' });
  }
});

/**
 * POST /api/essence-tap/prestige/upgrade
 * Purchase a prestige upgrade
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/prestige/upgrade', auth, async (req, res) => {
  const { upgradeId } = req.body;

  if (!upgradeId) {
    return res.status(400).json({ error: 'Upgrade ID required' });
  }

  // Use essence lock to prevent race conditions with concurrent requests
  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let state = user.essenceTap || stateService.getInitialState();

      const result = actions.purchasePrestigeUpgrade({ state, upgradeId });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const now = Date.now();
      user.essenceTap = result.newState;
      // Update lastEssenceTapRequest to prevent /status from adding duplicate passive gains
      user.lastEssenceTapRequest = now;
      await user.save();

      res.json({
        success: true,
        upgrade: result.upgrade,
        newLevel: result.newLevel,
        cost: result.cost,
        remainingShards: result.newState.prestigeShards
      });
    } catch (error) {
      console.error('Error purchasing prestige upgrade:', error);
      res.status(500).json({ error: 'Failed to purchase prestige upgrade' });
    }
  });
});

/**
 * POST /api/essence-tap/milestone/claim
 * Claim a Fate Points milestone
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/milestone/claim', auth, async (req, res) => {
  const { milestoneKey } = req.body;

  if (!milestoneKey) {
    return res.status(400).json({ error: 'Milestone key required' });
  }

  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const state = user.essenceTap || stateService.getInitialState();

      // Use unified action handler
      const result = actions.claimMilestone({ state, milestoneKey });

      if (!result.success) {
        return res.status(400).json({ error: result.error, code: result.code });
      }

      // Apply user changes (FP)
      if (result.userChanges) {
        shared.applyUserChanges(user, result.userChanges);
      }

      const now = Date.now();
      user.essenceTap = result.newState;
      user.lastEssenceTapRequest = now;
      await user.save();

      res.json({
        success: true,
        fatePoints: result.fatePoints,
        capped: result.capped
      });
    } catch (error) {
      console.error('Error claiming milestone:', error);
      res.status(500).json({ error: 'Failed to claim milestone' });
    }
  });
});

/**
 * POST /api/essence-tap/character/assign
 * Assign a character for production bonus
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/character/assign', auth, async (req, res) => {
  const { characterId } = req.body;

  if (!characterId) {
    return res.status(400).json({ error: 'Character ID required' });
  }

  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's characters
      const ownedCharacters = await shared.loadUserCharacters(user.id);

      const state = user.essenceTap || stateService.getInitialState();

      // Use unified action handler
      const result = actions.assignCharacter({
        state,
        characterId,
        ownedCharacters
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error, code: result.code });
      }

      const now = Date.now();
      user.essenceTap = result.newState;
      user.lastEssenceTapRequest = now;
      await user.save();

      res.json({
        success: true,
        assignedCharacters: result.assignedCharacters,
        ...result.bonuses
      });
    } catch (error) {
      console.error('Error assigning character:', error);
      res.status(500).json({ error: 'Failed to assign character' });
    }
  });
});

/**
 * POST /api/essence-tap/character/unassign
 * Unassign a character
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/character/unassign', auth, async (req, res) => {
  const { characterId } = req.body;

  if (!characterId) {
    return res.status(400).json({ error: 'Character ID required' });
  }

  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const state = user.essenceTap || stateService.getInitialState();

      // Get user's characters for bonus recalculation
      const ownedCharacters = await shared.loadUserCharacters(user.id);

      // Use unified action handler
      const result = actions.unassignCharacter({
        state,
        characterId,
        ownedCharacters
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error, code: result.code });
      }

      const now = Date.now();
      user.essenceTap = result.newState;
      user.lastEssenceTapRequest = now;
      await user.save();

      res.json({
        success: true,
        assignedCharacters: result.assignedCharacters,
        ...result.bonuses
      });
    } catch (error) {
      console.error('Error unassigning character:', error);
      res.status(500).json({ error: 'Failed to unassign character' });
    }
  });
});

/**
 * POST /api/essence-tap/save
 * Save current game state (for periodic auto-save)
 *
 * NOTE: This endpoint does NOT recalculate essence gains. Passive gains are
 * already applied by other endpoints (click, buy, etc.) via applyPassiveGains().
 * This endpoint simply persists the current state and updates timestamps.
 *
 * Calculating gains here would cause double-counting because:
 * 1. User actions call endpoints that run applyPassiveGains() → updates state.essence
 * 2. If /save also calculated gains from lastSaveTimestamp, it would add essence
 *    for time periods already credited by applyPassiveGains()
 */
/**
 * POST /api/essence-tap/save
 * Save player state
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/save', auth, async (req, res) => {
  // Use essence lock to prevent race conditions with /status endpoint
  // This ensures only one request modifies essence state at a time
  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let state = user.essenceTap || stateService.getInitialState();

      // Get user's characters for passive calculation and mastery persistence
      const userCharacters = await UserCharacter.findAll({
        where: { UserId: user.id },
        include: ['Character']
      });

      const characters = userCharacters.map(uc => ({
        id: uc.CharacterId,
        rarity: uc.Character?.rarity || 'common',
        element: uc.Character?.element || 'neutral'
      }));

      // Use action to save state (handles passive gains and mastery updates)
      const result = actions.saveState({ state, characters });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Persist character XP to UserCharacter model (routes-layer responsibility)
      // This syncs the essence tap XP tracking to the actual database records
      if (result.state.characterXP && Object.keys(result.state.characterXP).length > 0) {
        for (const [charId, xp] of Object.entries(result.state.characterXP)) {
          if (xp > 0) {
            const userChar = userCharacters.find(uc => String(uc.CharacterId) === String(charId));
            if (userChar) {
              userChar.masteryXp = (userChar.masteryXp || 0) + xp;
              await userChar.save();
            }
          }
        }
        // Clear the XP tracking after persistence
        result.state.characterXP = {};
      }

      user.essenceTap = result.state;
      user.lastEssenceTapRequest = result.savedAt;
      await user.save();

      res.json({
        success: true,
        savedAt: result.savedAt,
        essence: result.state.essence,
        lifetimeEssence: result.state.lifetimeEssence,
        sessionStats: result.sessionStats
      });
    } catch (error) {
      console.error('Error saving state:', error);
      res.status(500).json({ error: 'Failed to save' });
    }
  });
});

// ===========================================
// GAMBLE SYSTEM ROUTES
// ===========================================

/**
 * POST /api/essence-tap/gamble
 * Perform a gamble with essence
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/gamble', auth, async (req, res) => {
  const { betType, betAmount } = req.body;

  if (!betType || betAmount === undefined) {
    return res.status(400).json({ error: 'Bet type and amount required' });
  }

  // Use essence lock to prevent race conditions with concurrent requests
  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let state = user.essenceTap || stateService.getInitialState();
      state = stateService.resetDaily(state);

      // Get user's characters for passive calculation
      const characters = await shared.loadUserCharacters(user.id);

      // Apply passive essence before gamble
      const passiveResult = applyPassiveGains(state, characters);
      state = passiveResult.state;

      // Use unified action handler
      const result = await actions.performGamble({
        state,
        betAmount,
        betType,
        userId: req.user.id
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error, code: result.code });
      }

      // Apply user changes (FP, tickets) from action result
      if (result.userChanges) {
        shared.applyUserChanges(user, result.userChanges);
      }

      const now = Date.now();
      user.essenceTap = result.newState;
      user.lastEssenceTapRequest = now;
      await user.save();

      // Fetch updated jackpot info for response
      const jackpotInfo = await actions.getSharedJackpotInfo();

      res.json({
        success: true,
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
        jackpotInfo
      });
    } catch (error) {
      console.error('Error performing gamble:', error);
      res.status(500).json({ error: 'Failed to gamble' });
    }
  });
});

// ===========================================
// INFUSION SYSTEM ROUTES
// ===========================================

/**
 * POST /api/essence-tap/infusion
 * Perform an essence infusion for permanent bonus
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/infusion', auth, async (req, res) => {
  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let state = user.essenceTap || stateService.getInitialState();

      // Get user's characters for passive calculation
      const characters = await shared.loadUserCharacters(user.id);

      // Apply passive essence before infusion
      const passiveResult = applyPassiveGains(state, characters);
      state = passiveResult.state;

      // Use unified action handler
      const result = actions.performInfusion({ state });

      if (!result.success) {
        return res.status(400).json({ error: result.error, code: result.code });
      }

      const now = Date.now();
      user.essenceTap = result.newState;
      user.lastEssenceTapRequest = now;
      await user.save();

      res.json({
        success: true,
        cost: result.cost,
        costPercent: result.costPercent,
        bonusGained: result.bonusGained,
        totalBonus: result.totalBonus,
        infusionCount: result.infusionCount,
        nextCost: actions.getInfusionInfo(result.newState).nextCost,
        essence: result.essence
      });
    } catch (error) {
      console.error('Error performing infusion:', error);
      res.status(500).json({ error: 'Failed to infuse' });
    }
  });
});

// ===========================================
// ACTIVE ABILITIES ROUTES
// ===========================================

/**
 * POST /api/essence-tap/ability/activate
 * Activate an ability
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/ability/activate', auth, async (req, res) => {
  const { abilityId } = req.body;

  if (!abilityId) {
    return res.status(400).json({ error: 'Ability ID required' });
  }

  // Use essence lock to prevent race conditions with concurrent requests
  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let state = user.essenceTap || stateService.getInitialState();

      const result = actions.activateAbility({ state, abilityId });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const now = Date.now();
      user.essenceTap = result.newState;
      // Update lastEssenceTapRequest to prevent /status from adding duplicate passive gains
      user.lastEssenceTapRequest = now;
      await user.save();

      res.json({
        success: true,
        ability: result.ability,
        duration: result.duration,
        effects: result.effects,
        bonusEssence: result.bonusEssence,
        essence: result.essence,
        activeAbilities: result.activeAbilities
      });
    } catch (error) {
      console.error('Error activating ability:', error);
      res.status(500).json({ error: 'Failed to activate ability' });
    }
  });
});

/**
 * GET /api/essence-tap/daily-modifier
 * Get current daily modifier info
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.get('/daily-modifier', auth, async (req, res) => {
  try {
    const result = actions.getDailyModifier();

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      ...result.modifier,
      nextChangeIn: result.nextChangeIn
    });
  } catch (error) {
    console.error('Error getting daily modifier:', error);
    res.status(500).json({ error: 'Failed to get daily modifier' });
  }
});

// ===========================================
// REPEATABLE MILESTONES ROUTES
// ===========================================

/**
 * GET /api/essence-tap/milestones/repeatable
 * Get claimable repeatable milestones
 */
router.get('/milestones/repeatable', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();
    const milestones = actions.checkMilestones(state);

    res.json({
      claimable: milestones.repeatable,
      repeatableMilestones: state.repeatableMilestones || {}
    });
  } catch (error) {
    console.error('Error getting repeatable milestones:', error);
    res.status(500).json({ error: 'Failed to get milestones' });
  }
});

/**
 * POST /api/essence-tap/milestones/repeatable/claim
 * Claim a repeatable milestone
 */
router.post('/milestones/repeatable/claim', auth, async (req, res) => {
  const { milestoneType } = req.body;

  if (!milestoneType) {
    return res.status(400).json({ error: 'Milestone type required' });
  }

  // Use essence lock to prevent race conditions with concurrent requests
  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let state = user.essenceTap || stateService.getInitialState();

      const result = actions.claimRepeatableMilestone({ state, milestoneType });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const now = Date.now();
      result.newState.lastOnlineTimestamp = now;

      // Apply FP with cap enforcement (repeatable milestones count toward weekly cap)
      let actualFP = 0;
      let fpCapped = false;
      if (result.fatePoints > 0) {
        const fpResult = actions.applyFPWithCap(
          result.newState,
          result.fatePoints,
          'repeatable_milestone'
        );
        result.newState = fpResult.newState;
        actualFP = fpResult.actualFP;
        fpCapped = fpResult.capped;
      }

      user.essenceTap = result.newState;
      // Update lastEssenceTapRequest to prevent /status from adding duplicate passive gains
      user.lastEssenceTapRequest = now;

      // Award Fate Points (with cap applied)
      if (actualFP > 0) {
        const fatePoints = user.fatePoints || {};
        fatePoints.global = fatePoints.global || { points: 0 };
        fatePoints.global.points = (fatePoints.global.points || 0) + actualFP;
        user.fatePoints = fatePoints;
      }

      await user.save();

      res.json({
        success: true,
        fatePoints: actualFP,
        fatePointsCapped: fpCapped,
        count: result.count || 1
      });
    } catch (error) {
      console.error('Error claiming repeatable milestone:', error);
      res.status(500).json({ error: 'Failed to claim milestone' });
    }
  });
});

// ===========================================
// WEEKLY TOURNAMENT ROUTES
// ===========================================

/**
 * GET /api/essence-tap/tournament/weekly
 * Get weekly tournament info
 */
router.get('/tournament/weekly', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();
    const tournamentInfo = actions.getWeeklyTournamentInfo({ state });

    res.json(tournamentInfo);
  } catch (error) {
    console.error('Error getting tournament info:', error);
    res.status(500).json({ error: 'Failed to get tournament info' });
  }
});

/**
 * GET /api/essence-tap/tournament/leaderboard
 * Get weekly tournament leaderboard
 */
router.get('/tournament/leaderboard', auth, async (req, res) => {
  try {
    const currentWeek = actions.getCurrentWeekId();

    // Get all users with essence tap data for the current week
    const users = await User.findAll({
      attributes: ['id', 'username', 'essenceTap'],
      where: {
        essenceTap: {
          [require('sequelize').Op.ne]: null
        }
      }
    });

    // Filter and map users - show all who have ever played
    const leaderboard = users
      .filter(user => {
        const state = user.essenceTap;
        return state?.totalEssence > 0 || state?.weekly?.essenceEarned > 0;
      })
      .map(user => {
        const state = user.essenceTap;
        const weeklyEssence = state?.weekly?.weekId === currentWeek
          ? (state?.weekly?.essenceEarned || 0)
          : 0;
        return {
          id: user.id,
          username: user.username,
          weeklyEssence
        };
      })
      .sort((a, b) => b.weeklyEssence - a.weeklyEssence)
      .slice(0, 100) // Top 100
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    res.json({
      success: true,
      leaderboard,
      weekId: currentWeek
    });
  } catch (error) {
    console.error('Error getting tournament leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

/**
 * POST /api/essence-tap/tournament/weekly/claim
 * Claim weekly tournament rewards
 */
router.post('/tournament/weekly/claim', auth, rewardClaimLimiter, async (req, res) => {
  // Use transaction to ensure atomicity when awarding FP and tickets
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(req.user.id, { transaction, lock: true });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || stateService.getInitialState();

    const result = actions.claimWeeklyRewards({ state });

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    const now = Date.now();
    result.newState.lastOnlineTimestamp = now;

    // Apply FP with cap enforcement (tournament counts toward weekly cap)
    let actualFP = 0;
    let fpCapped = false;
    if (result.rewards.fatePoints > 0) {
      const fpResult = actions.applyFPWithCap(
        result.newState,
        result.rewards.fatePoints,
        'tournament'
      );
      result.newState = fpResult.newState;
      actualFP = fpResult.actualFP;
      fpCapped = fpResult.capped;
    }

    user.essenceTap = result.newState;
    // Update lastEssenceTapRequest to prevent /status from adding duplicate passive gains
    user.lastEssenceTapRequest = now;

    // Award Fate Points (with cap applied)
    if (actualFP > 0) {
      const fatePoints = user.fatePoints || {};
      fatePoints.global = fatePoints.global || { points: 0 };
      fatePoints.global.points = (fatePoints.global.points || 0) + actualFP;
      user.fatePoints = fatePoints;
    }

    // Award Roll Tickets
    if (result.rewards.rollTickets > 0) {
      user.rollTickets = (user.rollTickets || 0) + result.rewards.rollTickets;
    }

    await user.save({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      tier: result.tier,
      rewards: {
        ...result.rewards,
        fatePoints: actualFP,
        fatePointsCapped: fpCapped
      },
      // v4.0 additions
      breakdown: result.breakdown,
      bracketRank: result.bracketRank,
      streak: result.streak
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error claiming weekly rewards:', error);
    res.status(500).json({ error: 'Failed to claim rewards' });
  }
});

// ===========================================
// TOURNAMENT v4.0 ENHANCED ROUTES
// ===========================================

/**
 * GET /api/essence-tap/tournament/bracket-leaderboard
 * Get bracket-specific leaderboard
 */
router.get('/tournament/bracket-leaderboard', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();
    const userBracket = state.tournament?.bracket || 'C';
    const currentWeek = actions.getCurrentWeekId();

    // Get all users with essence tap data
    const users = await User.findAll({
      attributes: ['id', 'username', 'essenceTap'],
      where: {
        essenceTap: {
          [require('sequelize').Op.ne]: null
        }
      }
    });

    // Filter to users in the same bracket
    const bracketPlayers = users
      .filter(u => {
        const uState = u.essenceTap;
        const uBracket = uState?.tournament?.bracket || 'C';
        return uBracket === userBracket;
      })
      .map(u => {
        const uState = u.essenceTap;
        const weeklyEssence = uState?.weekly?.weekId === currentWeek
          ? (uState?.weekly?.essenceEarned || 0)
          : 0;
        return {
          id: u.id,
          username: u.username,
          weeklyEssence,
          bracket: uState?.tournament?.bracket || 'C'
        };
      })
      .sort((a, b) => b.weeklyEssence - a.weeklyEssence)
      .slice(0, BRACKET_SYSTEM.maxPlayersPerBracket)
      .map((entry, index) => ({
        ...entry,
        bracketRank: index + 1
      }));

    // Find user's rank in bracket
    const userRank = bracketPlayers.findIndex(p => p.id === req.user.id) + 1;

    res.json({
      success: true,
      bracket: userBracket,
      bracketInfo: BRACKET_SYSTEM.brackets[userBracket],
      leaderboard: bracketPlayers,
      userRank: userRank > 0 ? userRank : null,
      weekId: currentWeek
    });
  } catch (error) {
    console.error('Error getting bracket leaderboard:', error);
    res.status(500).json({ error: 'Failed to get bracket leaderboard' });
  }
});

/**
 * POST /api/essence-tap/tournament/checkpoint/claim
 * Claim a daily checkpoint reward
 */
router.post('/tournament/checkpoint/claim', auth, rewardClaimLimiter, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { day } = req.body;

    if (!day || day < 1 || day > 7) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid checkpoint day (1-7)' });
    }

    const user = await User.findByPk(req.user.id, { transaction, lock: true });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || stateService.getInitialState();
    const result = actions.claimTournamentCheckpoint({ state, day });

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    user.essenceTap = result.newState;

    // Award FP with cap
    let actualFP = 0;
    let fpCapped = false;
    if (result.rewards.fatePoints > 0) {
      const fpResult = actions.applyFPWithCap(
        result.newState,
        result.rewards.fatePoints,
        'checkpoint'
      );
      user.essenceTap = fpResult.newState;
      actualFP = fpResult.actualFP;
      fpCapped = fpResult.capped;

      // Update user FP
      const fatePoints = user.fatePoints || {};
      fatePoints.global = fatePoints.global || { points: 0 };
      fatePoints.global.points = (fatePoints.global.points || 0) + actualFP;
      user.fatePoints = fatePoints;
    }

    // Award tickets
    if (result.rewards.rollTickets > 0) {
      user.rollTickets = (user.rollTickets || 0) + result.rewards.rollTickets;
    }

    await user.save({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      day: result.day,
      checkpointName: result.checkpointName,
      rewards: {
        ...result.rewards,
        fatePoints: actualFP,
        fatePointsCapped: fpCapped
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error claiming checkpoint:', error);
    res.status(500).json({ error: 'Failed to claim checkpoint' });
  }
});

/**
 * GET /api/essence-tap/tournament/burning-hour
 * Get current burning hour status
 */
router.get('/tournament/burning-hour', auth, async (req, res) => {
  try {
    const status = actions.getBurningHourStatus();

    res.json({
      success: true,
      ...status,
      config: {
        duration: BURNING_HOURS.duration,
        multiplier: BURNING_HOURS.multiplier
      }
    });
  } catch (error) {
    console.error('Error getting burning hour status:', error);
    res.status(500).json({ error: 'Failed to get burning hour status' });
  }
});

/**
 * GET /api/essence-tap/tournament/cosmetics
 * Get user's tournament cosmetics
 */
router.get('/tournament/cosmetics', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();
    const cosmetics = state.tournament?.cosmetics || { owned: [], equipped: {} };

    // Get full cosmetic details
    const ownedDetails = cosmetics.owned.map(id =>
      TOURNAMENT_COSMETICS.items[id]
    ).filter(Boolean);

    const equippedDetails = {};
    for (const [slot, id] of Object.entries(cosmetics.equipped)) {
      if (id) {
        equippedDetails[slot] = TOURNAMENT_COSMETICS.items[id];
      }
    }

    res.json({
      success: true,
      owned: ownedDetails,
      equipped: equippedDetails,
      equippedIds: cosmetics.equipped,
      allCosmetics: TOURNAMENT_COSMETICS.items
    });
  } catch (error) {
    console.error('Error getting cosmetics:', error);
    res.status(500).json({ error: 'Failed to get cosmetics' });
  }
});

/**
 * POST /api/essence-tap/tournament/cosmetics/equip
 * Equip a tournament cosmetic
 */
router.post('/tournament/cosmetics/equip', auth, async (req, res) => {
  try {
    const { cosmeticId } = req.body;

    if (!cosmeticId) {
      return res.status(400).json({ error: 'Cosmetic ID required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || stateService.getInitialState();
    const result = actions.equipCosmetic({ state, cosmeticId });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    user.essenceTap = result.newState;
    await user.save();

    res.json({
      success: true,
      equippedSlot: result.equippedSlot,
      equipped: result.newState.tournament.cosmetics.equipped
    });
  } catch (error) {
    console.error('Error equipping cosmetic:', error);
    res.status(500).json({ error: 'Failed to equip cosmetic' });
  }
});

/**
 * POST /api/essence-tap/tournament/cosmetics/unequip
 * Unequip a tournament cosmetic from a slot
 */
router.post('/tournament/cosmetics/unequip', auth, async (req, res) => {
  try {
    const { slot } = req.body;

    if (!slot || !['avatarFrame', 'profileTitle', 'tapSkin'].includes(slot)) {
      return res.status(400).json({ error: 'Valid slot required (avatarFrame, profileTitle, tapSkin)' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || stateService.getInitialState();
    const result = actions.unequipCosmetic({ state, slot });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    user.essenceTap = result.newState;
    await user.save();

    res.json({
      success: true,
      equipped: result.newState.tournament.cosmetics.equipped
    });
  } catch (error) {
    console.error('Error unequipping cosmetic:', error);
    res.status(500).json({ error: 'Failed to unequip cosmetic' });
  }
});

/**
 * GET /api/essence-tap/tournament/rank-rewards
 * Get rank reward tiers info
 */
router.get('/tournament/rank-rewards', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      rankRewards: RANK_REWARDS.ranges,
      brackets: BRACKET_SYSTEM.brackets
    });
  } catch (error) {
    console.error('Error getting rank rewards:', error);
    res.status(500).json({ error: 'Failed to get rank rewards' });
  }
});

// ===========================================
// TICKET GENERATION ROUTES
// ===========================================

/**
 * GET /api/essence-tap/tickets/streak
 * Get daily streak ticket info
 */
router.get('/tickets/streak', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();
    const streakInfo = actions.checkDailyStreak(state);

    res.json({
      streakDays: streakInfo.streakDays || state.ticketGeneration?.dailyStreakDays || 0,
      canClaim: streakInfo.awarded,
      ticketsToEarn: streakInfo.tickets || 0,
      nextMilestone: streakInfo.nextMilestone
    });
  } catch (error) {
    console.error('Error getting streak info:', error);
    res.status(500).json({ error: 'Failed to get streak info' });
  }
});

/**
 * POST /api/essence-tap/tickets/streak/claim
 * Claim daily streak and potentially earn tickets
 */
router.post('/tickets/streak/claim', auth, async (req, res) => {
  // Use essence lock to prevent race conditions with concurrent requests
  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let state = user.essenceTap || stateService.getInitialState();

      const result = actions.checkDailyStreak(state);

      if (!result.newState) {
        // Already claimed today
        return res.status(400).json({ error: result.reason || 'Already claimed today' });
      }

      const now = Date.now();
      result.newState.lastOnlineTimestamp = now;
      user.essenceTap = result.newState;
      // Update lastEssenceTapRequest to prevent /status from adding duplicate passive gains
      user.lastEssenceTapRequest = now;

      // Award tickets if milestone reached
      if (result.awarded && result.tickets > 0) {
        user.rollTickets = (user.rollTickets || 0) + result.tickets;
      }

      await user.save();

      res.json({
        success: true,
        awarded: result.awarded,
        tickets: result.tickets || 0,
        streakDays: result.streakDays,
        nextMilestone: result.nextMilestone
      });
    } catch (error) {
      console.error('Error claiming streak:', error);
      res.status(500).json({ error: 'Failed to claim streak' });
    }
  });
});

/**
 * POST /api/essence-tap/tickets/exchange
 * Exchange Fate Points for roll tickets
 */
router.post('/tickets/exchange', auth, async (req, res) => {
  // Use essence lock to prevent race conditions with concurrent requests
  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let state = user.essenceTap || stateService.getInitialState();

      // Get user's Fate Points
      const fatePoints = user.fatePoints?.global?.points || 0;

      const result = actions.exchangeFatePointsForTickets({ state, user: { fatePoints } });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const now = Date.now();
      result.newState.lastOnlineTimestamp = now;
      user.essenceTap = result.newState;
      // Update lastEssenceTapRequest to prevent /status from adding duplicate passive gains
      user.lastEssenceTapRequest = now;

      // Deduct Fate Points
      const userFatePoints = user.fatePoints || {};
      userFatePoints.global = userFatePoints.global || { points: 0 };
      userFatePoints.global.points = Math.max(0, (userFatePoints.global.points || 0) - result.fatePointsCost);
      user.fatePoints = userFatePoints;

      // Add tickets
      user.rollTickets = (user.rollTickets || 0) + result.ticketsReceived;

      await user.save();

      res.json({
        success: true,
        fatePointsCost: result.fatePointsCost,
        ticketsReceived: result.ticketsReceived,
        exchangesRemaining: result.exchangesRemaining,
        newFatePoints: userFatePoints.global.points,
        newTickets: user.rollTickets
      });
    } catch (error) {
      console.error('Error exchanging for tickets:', error);
      res.status(500).json({ error: 'Failed to exchange' });
    }
  });
});

// ===========================================
// CHARACTER MASTERY ROUTES
// ===========================================

/**
 * GET /api/essence-tap/mastery
 * Get character mastery info for assigned characters
 */
router.get('/mastery', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();
    const masteryInfo = {};

    for (const charId of state.assignedCharacters || []) {
      masteryInfo[charId] = calculations.calculateCharacterMastery(state, charId);
    }

    const totalBonus = calculations.calculateTotalMasteryBonus(state);

    res.json({
      characterMastery: masteryInfo,
      totalBonus,
      masteryConfig: CHARACTER_MASTERY
    });
  } catch (error) {
    console.error('Error getting mastery info:', error);
    res.status(500).json({ error: 'Failed to get mastery info' });
  }
});

// ===========================================
// JACKPOT SYSTEM ROUTES
// ===========================================

/**
 * GET /api/essence-tap/jackpot
 * Get shared jackpot info
 */
router.get('/jackpot', auth, async (req, res) => {
  try {
    // Fetch shared jackpot info from database
    const jackpotInfo = await actions.getSharedJackpotInfo();

    res.json(jackpotInfo);
  } catch (error) {
    console.error('Error getting jackpot info:', error);
    res.status(500).json({ error: 'Failed to get jackpot info' });
  }
});

// ===========================================
// SERIES SYNERGY ROUTES
// ===========================================

/**
 * GET /api/essence-tap/synergy/series
 * Get series synergy bonuses
 */
router.get('/synergy/series', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();

    // Get user's characters
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: user.id },
      include: ['Character']
    });

    const characters = userCharacters.map(uc => ({
      id: uc.CharacterId,
      rarity: uc.Character?.rarity || 'common',
      element: uc.Character?.element || 'neutral',
      series: uc.Character?.series || 'Unknown'
    }));

    const seriesSynergy = calculations.calculateSeriesSynergy(state, characters);

    res.json({
      ...seriesSynergy,
      config: SERIES_SYNERGIES
    });
  } catch (error) {
    console.error('Error getting series synergy:', error);
    res.status(500).json({ error: 'Failed to get series synergy' });
  }
});

// ===========================================
// ESSENCE TYPES ROUTES
// ===========================================

/**
 * GET /api/essence-tap/essence-types
 * Get essence type breakdown and bonuses
 */
router.get('/essence-types', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();
    const essenceTypes = state.essenceTypes || { pure: 0, ambient: 0, golden: 0, prismatic: 0 };
    const bonuses = essenceTapService.getEssenceTypeBonuses(state);

    res.json({
      essenceTypes,
      bonuses,
      config: ESSENCE_TYPES
    });
  } catch (error) {
    console.error('Error getting essence types:', error);
    res.status(500).json({ error: 'Failed to get essence types' });
  }
});

// ===========================================
// SESSION STATS ROUTES
// ===========================================

/**
 * GET /api/essence-tap/session-stats
 * Get current session stats
 */
router.get('/session-stats', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();
    const sessionStats = actions.getSessionStats(state);

    res.json({
      ...sessionStats,
      miniMilestones: MINI_MILESTONES
    });
  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({ error: 'Failed to get session stats' });
  }
});

/**
 * GET /api/essence-tap/weekly-fp-budget
 * Get weekly FP budget info
 */
router.get('/weekly-fp-budget', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();
    const budget = actions.getWeeklyFPBudget(state);

    res.json({
      ...budget,
      config: WEEKLY_FP_CAP
    });
  } catch (error) {
    console.error('Error getting weekly FP budget:', error);
    res.status(500).json({ error: 'Failed to get budget' });
  }
});

/**
 * GET /api/essence-tap/config
 * Get game configuration for frontend display
 * This ensures frontend stays in sync with backend balance values
 */
router.get('/config', auth, async (_req, res) => {
  try {
    // Return game config using imported constants
    const config = {
      characterBonuses: GAME_CONFIG.characterBonuses,
      underdogBonuses: GAME_CONFIG.underdogBonuses,
      maxAssignedCharacters: GAME_CONFIG.maxAssignedCharacters,
      goldenEssenceChance: GAME_CONFIG.goldenEssenceChance,
      goldenEssenceMultiplier: GAME_CONFIG.goldenEssenceMultiplier,
      comboDecayTime: GAME_CONFIG.comboDecayTime,
      maxComboMultiplier: GAME_CONFIG.maxComboMultiplier,
      comboGrowthRate: GAME_CONFIG.comboGrowthRate,
      characterAbilities: CHARACTER_ABILITIES,
      elementSynergies: ELEMENT_SYNERGIES,
      seriesSynergies: SERIES_SYNERGIES,
      essenceTypes: ESSENCE_TYPES,
      dailyModifiers: DAILY_MODIFIERS,
      dailyChallenges: DAILY_CHALLENGES,
      miniMilestones: MINI_MILESTONES,
      weeklyFpCap: WEEKLY_FP_CAP,
      prestigeConfig: {
        minimumEssence: PRESTIGE_CONFIG.minimumEssence,
        cooldownMs: PRESTIGE_CONFIG.cooldownMs
      }
    };
    res.json(config);
  } catch (error) {
    console.error('Error getting game config:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

/**
 * GET /api/essence-tap/daily-challenges
 * Get daily challenges with progress
 */
router.get('/daily-challenges', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();
    const challenges = actions.getDailyChallengesWithProgress({ state });

    res.json({
      challenges,
      dailyStats: state.daily || {}
    });
  } catch (error) {
    console.error('Error getting daily challenges:', error);
    res.status(500).json({ error: 'Failed to get challenges' });
  }
});

/**
 * POST /api/essence-tap/daily-challenges/claim
 * Claim a completed daily challenge
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/daily-challenges/claim', auth, async (req, res) => {
  const { challengeId } = req.body;

  if (!challengeId) {
    return res.status(400).json({ error: 'Challenge ID required' });
  }

  // Use transaction to ensure atomicity when awarding FP and tickets
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(req.user.id, { transaction, lock: true });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();

    // Use unified action handler
    const result = actions.claimDailyChallenge({ state, challengeId });

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error, code: result.code });
    }

    const now = Date.now();
    user.essenceTap = result.newState;
    user.lastEssenceTapRequest = now;

    // Apply user changes (FP, tickets)
    if (result.userChanges) {
      shared.applyUserChanges(user, result.userChanges);
    }

    await user.save({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      rewards: result.rewards,
      challenge: result.challenge
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error claiming challenge:', error);
    res.status(500).json({ error: 'Failed to claim challenge' });
  }
});

/**
 * GET /api/essence-tap/boss
 * Get current boss encounter status
 */
router.get('/boss', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();
    const bossInfo = actions.getBossInfo(state);

    res.json(bossInfo);
  } catch (error) {
    console.error('Error getting boss info:', error);
    res.status(500).json({ error: 'Failed to get boss info' });
  }
});

/**
 * POST /api/essence-tap/boss/attack
 * Attack the current boss
 *
 * REFACTORED: Now uses unified action handler from services/essenceTap/actions
 */
router.post('/boss/attack', auth, async (req, res) => {
  const { damage } = req.body;

  // Use transaction to ensure atomicity when awarding FP, tickets, XP on boss defeat
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(req.user.id, { transaction, lock: true });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();

    // Get user's characters for damage calculation
    const characters = await shared.loadUserCharacters(user.id, { transaction });

    // Use unified action handler
    const result = actions.attackBoss({ state, damage, characters });

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error, code: result.code });
    }

    const now = Date.now();
    user.essenceTap = result.newState;
    user.lastEssenceTapRequest = now;

    // Apply user changes (FP, tickets, XP) from action result
    if (result.userChanges) {
      shared.applyUserChanges(user, result.userChanges);
    }

    await user.save({ transaction });
    await transaction.commit();

    // Build response object
    const response = {
      success: true,
      damageDealt: result.damageDealt,
      bossHealth: result.bossHealth,
      defeated: result.defeated,
      rewards: result.rewards,
      nextBossIn: result.nextBossIn
    };

    // Include boss spawn data if a new boss was spawned
    if (result.bossSpawned) {
      response.bossSpawned = true;
      response.boss = result.boss;
    }

    res.json(response);
  } catch (error) {
    await transaction.rollback();
    console.error('Error attacking boss:', error);
    res.status(500).json({ error: 'Failed to attack boss' });
  }
});

/**
 * GET /api/essence-tap/synergy-preview
 * Get synergy preview for team composition
 */
router.get('/synergy-preview', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || stateService.getInitialState();

    // Get user's characters
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: user.id },
      include: ['Character']
    });

    const characters = userCharacters.map(uc => ({
      id: uc.CharacterId,
      name: uc.Character?.name || 'Unknown',
      rarity: uc.Character?.rarity || 'common',
      element: uc.Character?.element || 'neutral',
      series: uc.Character?.series || 'Unknown',
      image: uc.Character?.image
    }));

    // Calculate current bonuses
    const currentBonuses = {
      characterBonus: calculations.calculateCharacterBonus(state, characters),
      elementBonuses: calculations.calculateElementBonuses(state, characters),
      elementSynergy: calculations.calculateElementSynergy(state, characters),
      seriesSynergy: calculations.calculateSeriesSynergy(state, characters),
      underdogBonus: calculations.calculateUnderdogBonus(state, characters),
      masteryBonus: calculations.calculateTotalMasteryBonus(state).productionBonus || 0
    };

    // Group characters by series for synergy suggestions
    const seriesGroups = {};
    const elementGroups = {};

    for (const char of characters) {
      // Group by series
      if (!seriesGroups[char.series]) {
        seriesGroups[char.series] = [];
      }
      seriesGroups[char.series].push(char);

      // Group by element
      if (!elementGroups[char.element]) {
        elementGroups[char.element] = [];
      }
      elementGroups[char.element].push(char);
    }

    // Find best synergy options
    const synergySuggestions = [];

    // Series with 2+ characters
    for (const [series, chars] of Object.entries(seriesGroups)) {
      if (chars.length >= 2) {
        synergySuggestions.push({
          type: 'series',
          name: series,
          characters: chars.slice(0, 5),
          count: chars.length,
          potentialBonus: SERIES_SYNERGIES.matchBonuses[Math.min(chars.length, 5)]
        });
      }
    }

    // Elements with 2+ characters
    for (const [element, chars] of Object.entries(elementGroups)) {
      if (chars.length >= 2) {
        synergySuggestions.push({
          type: 'element',
          name: element,
          characters: chars.slice(0, 5),
          count: chars.length,
          potentialBonus: chars.length >= 5 ? 0.25 : chars.length * 0.05
        });
      }
    }

    // Sort suggestions by potential bonus
    synergySuggestions.sort((a, b) => b.potentialBonus - a.potentialBonus);

    res.json({
      assignedCharacters: state.assignedCharacters || [],
      currentBonuses,
      synergySuggestions: synergySuggestions.slice(0, 10),
      availableCharacters: characters,
      config: {
        maxCharacters: GAME_CONFIG.maxAssignedCharacters,
        seriesSynergies: SERIES_SYNERGIES,
        elementBonuses: calculations.calculateElementBonuses
      }
    });
  } catch (error) {
    console.error('Error getting synergy preview:', error);
    res.status(500).json({ error: 'Failed to get synergy preview' });
  }
});

// ===========================================
// PAGE LIFECYCLE ENDPOINTS
// ===========================================

/**
 * POST /api/essence-tap/sync-on-leave
 *
 * CRITICAL ENDPOINT for handling page unload scenarios (F5 refresh, tab close, browser close)
 * This endpoint receives data via navigator.sendBeacon() which is the ONLY reliable way
 * to send data when a page is unloading.
 *
 * Requirements:
 * - Must be fast - browser won't wait for response
 * - Must be idempotent - may be called multiple times
 * - Must validate against replay attacks using timestamps
 * - Must handle partial/corrupted data gracefully
 *
 * Note: This endpoint should NOT require the 'auth' middleware in the traditional sense
 * because sendBeacon doesn't support custom headers. Instead, we include the token in the body.
 */
router.post('/sync-on-leave', async (req, res) => {
  try {
    const {
      token,
      pendingTaps = 0,
      pendingActions = [],
      finalEssence: _finalEssence,
      timestamp,
      lastConfirmedSeq = 0
    } = req.body;

    // Validate timestamp is recent (within last 10 seconds) to prevent replay attacks
    const now = Date.now();
    if (!timestamp || now - timestamp > 10000) {
      // Silently ignore stale requests - don't return error as browser won't see it anyway
      return res.status(200).json({ success: false, reason: 'stale_request' });
    }

    // Verify token and get user
    if (!token) {
      return res.status(200).json({ success: false, reason: 'no_token' });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(200).json({ success: false, reason: 'invalid_token' });
    }

    // Support both token formats: { id: ... } and { user: { id: ... } }
    // This matches the auth pattern used elsewhere in the codebase
    const userId = decoded.user?.id || decoded.userId || decoded.id;
    if (!userId) {
      return res.status(200).json({ success: false, reason: 'invalid_user' });
    }

    // Use essence lock to prevent race conditions
    return withEssenceLock(userId, async () => {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(200).json({ success: false, reason: 'user_not_found' });
      }

      let state = user.essenceTap || stateService.getInitialState();

      // Get user's characters for bonus calculation
      const userCharacters = await UserCharacter.findAll({
        where: { UserId: userId },
        include: ['Character']
      });

      const characters = userCharacters.map(uc => ({
        id: uc.CharacterId,
        rarity: uc.Character?.rarity || 'common',
        element: uc.Character?.element || 'neutral'
      }));

      // Apply any passive gains since last update
      const passiveResult = applyPassiveGains(state, characters);
      state = passiveResult.state;

      // Process pending taps if they haven't been processed yet
      // Use lastConfirmedSeq to prevent double-processing
      if (pendingTaps > 0) {
        const clickPower = calculations.calculateClickPower(state, characters);
        const tapEssence = Math.floor(pendingTaps * clickPower);

        state.essence = (state.essence || 0) + tapEssence;
        state.lifetimeEssence = (state.lifetimeEssence || 0) + tapEssence;
        state.totalClicks = (state.totalClicks || 0) + pendingTaps;

        // Update daily stats
        state.daily = state.daily || {};
        state.daily.clicks = (state.daily.clicks || 0) + pendingTaps;
        state.daily.essenceEarned = (state.daily.essenceEarned || 0) + tapEssence;

        // Update weekly tournament progress with burning hour check
        const tapBurningHourStatus = actions.getBurningHourStatus();
        const weeklyResult = actions.updateWeeklyProgress({
          state,
          essence: tapEssence,
          options: { burningHourActive: tapBurningHourStatus.active }
        });
        state = weeklyResult.newState || state;
      }

      // Process pending non-tap actions that haven't been confirmed
      // These are actions that were queued offline
      // Use server-stored lastConfirmedSeq to prevent replay of already-processed actions
      const serverLastConfirmedSeq = state.lastConfirmedSeq || 0;
      let maxProcessedSeq = serverLastConfirmedSeq;

      for (const action of pendingActions) {
        // Skip if this action was already processed (seq <= server's confirmed seq)
        // Also skip if seq is less than or equal to client's reported lastConfirmedSeq
        if (action.seq <= serverLastConfirmedSeq || action.seq <= lastConfirmedSeq) continue;

        // Only process certain action types that are safe to replay
        if (action.type === 'purchase_generator' && action.data?.generatorId) {
          const result = actions.purchaseGenerator({
            state,
            generatorId: action.data.generatorId,
            count: action.data.count || 1
          });
          if (result.success) {
            state = result.newState;
            maxProcessedSeq = Math.max(maxProcessedSeq, action.seq);
          }
        } else if (action.type === 'purchase_upgrade' && action.data?.upgradeId) {
          const result = actions.purchaseUpgrade({
            state,
            upgradeId: action.data.upgradeId
          });
          if (result.success) {
            state = result.newState;
            maxProcessedSeq = Math.max(maxProcessedSeq, action.seq);
          }
        }
        // Skip other actions (prestige, gamble, infusion) - these require user confirmation
      }

      // Update the server-side lastConfirmedSeq to prevent replay attacks
      if (maxProcessedSeq > serverLastConfirmedSeq) {
        state.lastConfirmedSeq = maxProcessedSeq;
      }

      // Update timestamp
      state.lastOnlineTimestamp = now;
      state.lastSaveTimestamp = now;

      // Save state
      user.essenceTap = state;
      user.lastEssenceTapRequest = now;
      await user.save();

      // Return success - though browser likely won't see this
      res.status(200).json({
        success: true,
        essence: state.essence,
        appliedTaps: pendingTaps,
        appliedActions: pendingActions.length
      });
    });
  } catch (error) {
    console.error('Error in sync-on-leave:', error);
    // Always return 200 for sendBeacon - browser won't see errors anyway
    res.status(200).json({ success: false, reason: 'error' });
  }
});

/**
 * POST /api/essence-tap/initialize
 *
 * Called when user loads/returns to the Essence Tap page.
 * Handles:
 * - Applying any pending actions from localStorage backup
 * - Calculating offline earnings
 * - Returning the authoritative server state
 *
 * This is the companion endpoint to sync-on-leave - together they handle
 * the complete page lifecycle for F5/tab close/browser close scenarios.
 */
router.post('/initialize', auth, async (req, res) => {
  const {
    pendingActions = [],
    clientTimestamp,
    lastKnownEssence: _lastKnownEssence,
    lastKnownTimestamp
  } = req.body;

  // BUG #3 & #8 FIX: Check for cached/duplicate initialization
  // This prevents multi-tab duplicate offline earnings
  const cachedResult = getCachedInitialization(req.user.id, clientTimestamp);
  if (cachedResult) {
    console.log(`[EssenceTap] Returning cached initialization for user ${req.user.id}`);
    // For cached results, don't include offline earnings again to prevent duplication
    return res.json({
      ...cachedResult,
      offlineEarnings: 0,  // Already awarded in first request
      offlineDuration: 0,
      pendingActionsApplied: 0  // Already applied in first request
    });
  }

  return withEssenceLock(req.user.id, async () => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let state = user.essenceTap || stateService.getInitialState();

      // Reset daily if needed
      state = stateService.resetDaily(state);

      // Reset weekly FP tracking if new week
      state = actions.resetWeeklyFPIfNeeded(state);

      // Reset session stats for new session
      state = stateService.resetSessionStats(state);

      // Get user's characters for bonus calculation
      const userCharacters = await UserCharacter.findAll({
        where: { UserId: user.id },
        include: ['Character']
      });

      const characters = userCharacters.map(uc => ({
        id: uc.CharacterId,
        rarity: uc.Character?.rarity || 'common',
        element: uc.Character?.element || 'neutral'
      }));

      // Validate and apply pending actions from client backup
      // Only apply if they're recent (within last hour) and have valid timestamps
      let actionsApplied = 0;
      if (pendingActions.length > 0 && lastKnownTimestamp) {
        const oneHourAgo = Date.now() - 3600000;
        if (lastKnownTimestamp > oneHourAgo) {
          for (const action of pendingActions) {
            // Only process tap actions - other actions should have gone through sendBeacon
            if (action.type === 'tap' && action.data?.count > 0) {
              const clickPower = calculations.calculateClickPower(state, characters);
              const tapEssence = Math.floor(action.data.count * clickPower);

              state.essence = (state.essence || 0) + tapEssence;
              state.lifetimeEssence = (state.lifetimeEssence || 0) + tapEssence;
              state.totalClicks = (state.totalClicks || 0) + action.data.count;

              // Update daily stats
              state.daily = state.daily || {};
              state.daily.clicks = (state.daily.clicks || 0) + action.data.count;
              state.daily.essenceEarned = (state.daily.essenceEarned || 0) + tapEssence;

              actionsApplied++;
            }
          }
        }
      }

      // Calculate offline progress
      const now = Date.now();
      const lastActive = state.lastOnlineTimestamp || state.lastSaveTimestamp || now;
      const offlineSeconds = Math.floor((now - lastActive) / 1000);

      // MULTI-TAB PROTECTION: Only grant offline earnings if user was away for at least 30 seconds
      // This prevents duplicate rewards when multiple tabs call /initialize simultaneously
      // The first tab to call /initialize updates lastOnlineTimestamp, so subsequent tabs
      // within the same session will see offlineSeconds < 30 and get 0 earnings
      const MIN_OFFLINE_SECONDS_FOR_EARNINGS = 30;

      // Calculate offline earnings only if user was away long enough
      // FIX: Use shared calculateOfflineProgress function to properly apply all buffs
      // (character bonuses, prestige upgrades, element bonuses, etc.)
      let offlineProgress = { essenceEarned: 0, hoursAway: 0, efficiency: 0.5 };

      if (offlineSeconds >= MIN_OFFLINE_SECONDS_FOR_EARNINGS) {
        // Temporarily set lastOnlineTimestamp for calculation
        const stateForCalc = { ...state, lastOnlineTimestamp: now - (offlineSeconds * 1000) };
        offlineProgress = calculations.calculateOfflineProgress(stateForCalc, characters);

        // Apply offline earnings
        if (offlineProgress.essenceEarned > 0) {
          state.essence = (state.essence || 0) + offlineProgress.essenceEarned;
          state.lifetimeEssence = (state.lifetimeEssence || 0) + offlineProgress.essenceEarned;

          // Track total offline earnings
          state.stats = state.stats || {};
          state.stats.totalOfflineEarnings = (state.stats.totalOfflineEarnings || 0) + offlineProgress.essenceEarned;
        }
      }

      // Update timestamp
      state.lastOnlineTimestamp = now;
      user.lastEssenceTapRequest = now;

      // Save state
      user.essenceTap = state;
      await user.save();

      // Get full game state for response
      const gameState = actions.getGameState({ state, characters });
      const weeklyFPBudget = actions.getWeeklyFPBudget(state);

      const response = {
        currentState: gameState,
        offlineEarnings: offlineProgress.essenceEarned,
        offlineDuration: offlineProgress.hoursAway * 3600, // Convert hours to seconds for consistency
        productionPerSecond: offlineProgress.productionRate || calculations.calculateProductionPerSecond(state, characters),
        offlineEfficiency: offlineProgress.efficiency,
        pendingActionsApplied: actionsApplied,
        weeklyFPBudget,
        sessionStats: actions.getSessionStats(state)
      };

      // BUG #3 & #8 FIX: Cache this initialization for deduplication
      cacheInitialization(req.user.id, clientTimestamp, response);

      res.json(response);
    } catch (error) {
      console.error('Error initializing essence tap:', error);
      res.status(500).json({ error: 'Failed to initialize' });
    }
  });
});

module.exports = router;
