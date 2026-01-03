/**
 * Core Essence Tap Routes
 *
 * Handles core gameplay functionality:
 * - GET /status - Initialize/get current state
 * - POST /click - Process click(s)
 * - POST /sync-on-leave - Sync state when leaving
 * - GET /config - Get game configuration
 */

const express = require('express');
const router = express.Router();
const { UserCharacter } = require('../../../models');
const essenceTapService = require('../../../services/essenceTapService');
const { createRoute, createGetRoute } = require('../createRoute');
const {
  clickRateLimitMiddleware,
  getCachedInitialization,
  cacheInitialization
} = require('../middleware');

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Apply passive essence gains before performing essence-modifying operations
 */
async function applyPassiveGains(state, characters, maxSeconds = 300) {
  const now = Date.now();
  const lastUpdate = state.lastOnlineTimestamp || state.lastSaveTimestamp || now;
  const elapsedMs = now - lastUpdate;
  const elapsedSeconds = Math.min(elapsedMs / 1000, maxSeconds);

  // Guard: If gains were applied very recently, skip to prevent double-counting
  const MIN_PASSIVE_GAIN_INTERVAL_MS = 1000;
  if (elapsedMs < MIN_PASSIVE_GAIN_INTERVAL_MS) {
    return { state, gainsApplied: 0 };
  }

  if (elapsedSeconds <= 0) {
    return { state, gainsApplied: 0 };
  }

  const activeAbilityEffects = essenceTapService.getActiveAbilityEffects(state);
  let productionPerSecond = essenceTapService.calculateProductionPerSecond(state, characters);
  if (activeAbilityEffects.productionMultiplier) {
    productionPerSecond *= activeAbilityEffects.productionMultiplier;
  }

  const passiveGain = Math.floor(productionPerSecond * elapsedSeconds);
  if (passiveGain > 0) {
    state.essence = (state.essence || 0) + passiveGain;
    state.lifetimeEssence = (state.lifetimeEssence || 0) + passiveGain;
    // Check burning hour status for tournament multiplier
    const burningHourStatus = essenceTapService.getBurningHourStatus();
    const weeklyResult = essenceTapService.updateWeeklyProgress(state, passiveGain, {
      burningHourActive: burningHourStatus.active
    });
    state = weeklyResult.newState;
  }

  // Update timestamp to mark when gains were last applied
  state.lastOnlineTimestamp = now;

  return { state, gainsApplied: passiveGain };
}

/**
 * Get user's characters for bonus calculations
 */
async function getUserCharacters(userId) {
  const userCharacters = await UserCharacter.findAll({
    where: { UserId: userId },
    include: ['Character']
  });

  return userCharacters.map(uc => ({
    id: uc.CharacterId,
    rarity: uc.Character?.rarity || 'common',
    element: uc.Character?.element || 'neutral'
  }));
}

// ===========================================
// ROUTES
// ===========================================

/**
 * GET /status
 * Initialize or get current essence tap state with offline progress
 */
router.get('/status', createGetRoute(async (state, user, req) => {
  // Check for cached response to prevent duplicate initialization
  const cached = getCachedInitialization(user.id, req.query.timestamp);
  if (cached) {
    return cached;
  }

  // Reset daily if needed
  state = essenceTapService.resetDaily(state);

  // Reset weekly FP tracking if new week
  state = essenceTapService.resetWeeklyFPIfNeeded(state);

  // Reset session stats for new session
  state = essenceTapService.resetSessionStats(state);

  // Get user's characters for bonus calculation
  const characters = await getUserCharacters(user.id);

  // Validate offline progress with server-side timestamp check
  const now = Date.now();
  const lastApiRequestTime = user.lastEssenceTapRequest || state.lastOnlineTimestamp || now;

  // Only award offline progress if the time since last API request is reasonable
  // Max offline is 8 hours = 28800000ms
  const maxOfflineMs = 8 * 60 * 60 * 1000;
  const timeSinceLastRequest = Math.min(now - lastApiRequestTime, maxOfflineMs);

  // Calculate offline progress with validated time
  const offlineProgress = essenceTapService.calculateOfflineProgress(
    { ...state, lastOnlineTimestamp: now - timeSinceLastRequest },
    characters
  );

  if (offlineProgress.essenceEarned > 0) {
    state.essence = (state.essence || 0) + offlineProgress.essenceEarned;
    state.lifetimeEssence = (state.lifetimeEssence || 0) + offlineProgress.essenceEarned;
  }

  // Update timestamps
  state.lastOnlineTimestamp = now;
  user.lastEssenceTapRequest = now;
  user.essenceTap = state;
  await user.save();

  // Get full game state for response
  const gameState = essenceTapService.getGameState(state, characters);

  // Add weekly FP budget info
  const weeklyFPBudget = essenceTapService.getWeeklyFPBudget(state);

  const response = {
    ...gameState,
    offlineProgress: offlineProgress.essenceEarned > 0 ? offlineProgress : null,
    weeklyFPBudget,
    sessionStats: essenceTapService.getSessionStats(state)
  };

  // Cache the response
  cacheInitialization(user.id, req.query.timestamp, response);

  return response;
}));

/**
 * POST /click
 * Process click(s) and return result
 */
router.post('/click', clickRateLimitMiddleware, createRoute({
  validate: (body) => {
    const count = parseInt(body.count, 10);
    if (isNaN(count) || count < 1) {
      return 'Invalid click count';
    }
    if (count > essenceTapService.GAME_CONFIG.maxClicksPerSecond) {
      return 'Too many clicks';
    }
    return null;
  },
  resetDaily: true,
  execute: async (ctx) => {
    const { count = 1, comboMultiplier = 1 } = ctx.body;
    const requestedClicks = Math.min(
      Math.max(1, parseInt(count, 10) || 1),
      essenceTapService.GAME_CONFIG.maxClicksPerSecond
    );

    // Get user's characters for bonus calculation
    const characters = await getUserCharacters(ctx.user.id);

    // Apply passive essence accumulated since last update
    const passiveResult = await applyPassiveGains(ctx.state, characters);
    ctx.state = passiveResult.state;

    // Get active ability effects
    const activeAbilityEffects = essenceTapService.getActiveAbilityEffects(ctx.state);

    // Process clicks
    let totalEssence = 0;
    let totalCrits = 0;
    let goldenClicks = 0;

    for (let i = 0; i < requestedClicks; i++) {
      const result = essenceTapService.processClick(
        ctx.state,
        characters,
        comboMultiplier,
        activeAbilityEffects
      );
      totalEssence += result.essenceGained;
      if (result.isCrit) totalCrits++;
      if (result.isGolden) goldenClicks++;
    }

    // Update state
    ctx.state.essence = (ctx.state.essence || 0) + totalEssence;
    ctx.state.lifetimeEssence = (ctx.state.lifetimeEssence || 0) + totalEssence;
    ctx.state.totalClicks = (ctx.state.totalClicks || 0) + requestedClicks;
    ctx.state.totalCrits = (ctx.state.totalCrits || 0) + totalCrits;

    // Update daily
    ctx.state.daily = ctx.state.daily || {};
    ctx.state.daily.clicks = (ctx.state.daily.clicks || 0) + requestedClicks;
    ctx.state.daily.crits = (ctx.state.daily.crits || 0) + totalCrits;
    ctx.state.daily.essenceEarned = (ctx.state.daily.essenceEarned || 0) + totalEssence;

    // Update stats
    ctx.state.stats = ctx.state.stats || {};
    ctx.state.stats.goldenEssenceClicks = (ctx.state.stats.goldenEssenceClicks || 0) + goldenClicks;

    // Update session stats
    if (!ctx.state.sessionStats) {
      ctx.state.sessionStats = {
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
    if (!ctx.state.sessionStats.sessionStartTime) {
      ctx.state.sessionStats.sessionStartTime = Date.now();
    }

    // Track session essence
    ctx.state.sessionStats.sessionEssence = (ctx.state.sessionStats.sessionEssence || 0) + totalEssence;

    // Update weekly tournament progress
    const burningHourStatus = essenceTapService.getBurningHourStatus();
    const weeklyResult = essenceTapService.updateWeeklyProgress(ctx.state, totalEssence, {
      burningHourActive: burningHourStatus.active
    });
    ctx.state = weeklyResult.newState;

    // Check for daily challenge completions
    const completedChallenges = essenceTapService.checkDailyChallenges(ctx.state);

    return {
      success: true,
      newState: ctx.state,
      data: {
        essenceGained: totalEssence,
        totalCrits,
        goldenClicks,
        essence: ctx.state.essence,
        lifetimeEssence: ctx.state.lifetimeEssence,
        totalClicks: ctx.state.totalClicks,
        completedChallenges: completedChallenges.length > 0 ? completedChallenges : undefined,
        burningHourActive: burningHourStatus.active
      }
    };
  }
}));

/**
 * POST /sync-on-leave
 * Synchronize state when user leaves the page (sendBeacon)
 */
router.post('/sync-on-leave', async (req, res) => {
  try {
    const {
      token,
      pendingTaps = 0,
      pendingActions = [],
      timestamp
    } = req.body;

    // Validate timestamp is recent (within last 10 seconds) to prevent replay attacks
    const now = Date.now();
    if (!timestamp || now - timestamp > 10000) {
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

    // Support both token formats
    const userId = decoded.user?.id || decoded.userId || decoded.id;
    if (!userId) {
      return res.status(200).json({ success: false, reason: 'invalid_user' });
    }

    const { User } = require('../../../models');
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(200).json({ success: false, reason: 'user_not_found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    // Get user's characters for bonus calculation
    const characters = await getUserCharacters(userId);

    // Apply any passive gains since last update
    const passiveResult = await applyPassiveGains(state, characters);
    state = passiveResult.state;

    // Process pending taps if any
    if (pendingTaps > 0) {
      const clickPower = essenceTapService.calculateClickPower(state, characters);
      const tapEssence = Math.floor(pendingTaps * clickPower);

      state.essence = (state.essence || 0) + tapEssence;
      state.lifetimeEssence = (state.lifetimeEssence || 0) + tapEssence;
      state.totalClicks = (state.totalClicks || 0) + pendingTaps;

      // Update daily stats
      state.daily = state.daily || {};
      state.daily.clicks = (state.daily.clicks || 0) + pendingTaps;
      state.daily.essenceEarned = (state.daily.essenceEarned || 0) + tapEssence;

      // Update weekly tournament progress
      const tapBurningHourStatus = essenceTapService.getBurningHourStatus();
      const weeklyResult = essenceTapService.updateWeeklyProgress(state, tapEssence, {
        burningHourActive: tapBurningHourStatus.active
      });
      state = weeklyResult.newState;
    }

    // Process pending actions (simplified - only process safe actions)
    for (const action of pendingActions) {
      if (action.type === 'purchase_generator' && action.data?.generatorId) {
        const result = essenceTapService.purchaseGenerator(
          state,
          action.data.generatorId,
          action.data.count || 1
        );
        if (result.success) {
          state = result.newState;
        }
      } else if (action.type === 'purchase_upgrade' && action.data?.upgradeId) {
        const result = essenceTapService.purchaseUpgrade(state, action.data.upgradeId);
        if (result.success) {
          state = result.newState;
        }
      }
    }

    // Save state
    state.lastOnlineTimestamp = now;
    user.essenceTap = state;
    user.lastEssenceTapRequest = now;
    await user.save();

    res.json({
      success: true,
      essence: state.essence,
      lifetimeEssence: state.lifetimeEssence
    });
  } catch (error) {
    console.error('[EssenceTap] Sync-on-leave error:', error);
    res.status(200).json({ success: false, reason: 'server_error' });
  }
});

/**
 * GET /config
 * Get game configuration constants
 */
router.get('/config', createGetRoute(() => {
  return essenceTapService.getGameConfig();
}));

module.exports = router;
