/**
 * Essence Tap Routes
 *
 * API endpoints for the Essence Tap clicker minigame.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { User, UserCharacter } = require('../models');
const essenceTapService = require('../services/essenceTapService');
const accountLevelService = require('../services/accountLevelService');

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
 * GET /api/essence-tap/status
 * Get current clicker state and calculate offline progress
 */
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or initialize clicker state
    let state = user.essenceTap || essenceTapService.getInitialState();

    // Reset daily if needed
    state = essenceTapService.resetDaily(state);

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

    // Calculate offline progress
    const offlineProgress = essenceTapService.calculateOfflineProgress(state, characters);

    if (offlineProgress.essenceEarned > 0) {
      state.essence = (state.essence || 0) + offlineProgress.essenceEarned;
      state.lifetimeEssence = (state.lifetimeEssence || 0) + offlineProgress.essenceEarned;
    }

    // Update timestamp
    state.lastOnlineTimestamp = Date.now();

    // Save state
    user.essenceTap = state;
    await user.save();

    // Get full game state for response
    const gameState = essenceTapService.getGameState(state, characters);

    res.json({
      ...gameState,
      offlineProgress: offlineProgress.essenceEarned > 0 ? offlineProgress : null
    });
  } catch (error) {
    console.error('Error getting essence tap status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * POST /api/essence-tap/click
 * Process click(s) and return result
 */
router.post('/click', auth, async (req, res) => {
  try {
    const { count = 1, comboMultiplier = 1 } = req.body;

    // Server-side rate limit check
    const requestedClicks = Math.min(Math.max(1, count), essenceTapService.GAME_CONFIG.maxClicksPerSecond);
    const rateLimit = checkClickRateLimit(req.user.id, requestedClicks);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        remaining: rateLimit.remaining,
        resetIn: rateLimit.resetIn
      });
    }

    // Use the allowed click count (may be less than requested if near limit)
    const clickCount = Math.min(requestedClicks, rateLimit.remaining + requestedClicks);

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();
    state = essenceTapService.resetDaily(state);

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

    // Get active ability effects
    const activeAbilityEffects = essenceTapService.getActiveAbilityEffects(state);

    // Process clicks
    let totalEssence = 0;
    let totalCrits = 0;
    let goldenClicks = 0;

    for (let i = 0; i < clickCount; i++) {
      const result = essenceTapService.processClick(state, characters, comboMultiplier, activeAbilityEffects);
      totalEssence += result.essenceGained;
      if (result.isCrit) totalCrits++;
      if (result.isGolden) goldenClicks++;
    }

    // Update state
    state.essence = (state.essence || 0) + totalEssence;
    state.lifetimeEssence = (state.lifetimeEssence || 0) + totalEssence;
    state.totalClicks = (state.totalClicks || 0) + clickCount;
    state.totalCrits = (state.totalCrits || 0) + totalCrits;

    // Update daily
    state.daily = state.daily || {};
    state.daily.clicks = (state.daily.clicks || 0) + clickCount;
    state.daily.crits = (state.daily.crits || 0) + totalCrits;
    state.daily.essenceEarned = (state.daily.essenceEarned || 0) + totalEssence;

    // Update stats
    state.stats = state.stats || {};
    state.stats.goldenEssenceClicks = (state.stats.goldenEssenceClicks || 0) + goldenClicks;

    // Update weekly tournament progress
    state = essenceTapService.updateWeeklyProgress(state, totalEssence);

    // Classify and track essence types
    // Note: For batch clicks, we use last click's golden status for simplicity
    const essenceTypeBreakdown = essenceTapService.classifyEssence(totalEssence, goldenClicks > 0, totalCrits > 0);
    state = essenceTapService.updateEssenceTypes(state, essenceTypeBreakdown);

    state.lastOnlineTimestamp = Date.now();

    // Check for new daily challenge completions
    const completedChallenges = essenceTapService.checkDailyChallenges(state);

    // Save
    user.essenceTap = state;
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

/**
 * POST /api/essence-tap/generator/buy
 * Purchase generator(s)
 */
router.post('/generator/buy', auth, async (req, res) => {
  try {
    const { generatorId, count = 1 } = req.body;

    if (!generatorId) {
      return res.status(400).json({ error: 'Generator ID required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.purchaseGenerator(state, generatorId, count);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();

    // Check for new daily challenge completions
    const completedChallenges = essenceTapService.checkDailyChallenges(result.newState);

    user.essenceTap = result.newState;
    await user.save();

    // Get updated game state
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: user.id },
      include: ['Character']
    });

    const characters = userCharacters.map(uc => ({
      id: uc.CharacterId,
      rarity: uc.Character?.rarity || 'common',
      element: uc.Character?.element || 'neutral'
    }));

    const gameState = essenceTapService.getGameState(result.newState, characters);

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

/**
 * POST /api/essence-tap/upgrade/buy
 * Purchase an upgrade
 */
router.post('/upgrade/buy', auth, async (req, res) => {
  try {
    const { upgradeId } = req.body;

    if (!upgradeId) {
      return res.status(400).json({ error: 'Upgrade ID required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.purchaseUpgrade(state, upgradeId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();

    user.essenceTap = result.newState;
    await user.save();

    // Award XP for upgrade purchase
    await accountLevelService.awardXP(user.id, essenceTapService.GAME_CONFIG.xpPerUpgrade || 2, 'essence_tap_upgrade');

    // Get updated game state
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: user.id },
      include: ['Character']
    });

    const characters = userCharacters.map(uc => ({
      id: uc.CharacterId,
      rarity: uc.Character?.rarity || 'common',
      element: uc.Character?.element || 'neutral'
    }));

    const gameState = essenceTapService.getGameState(result.newState, characters);

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

/**
 * POST /api/essence-tap/prestige
 * Perform prestige (awakening)
 */
router.post('/prestige', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.performPrestige(state, user);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();

    user.essenceTap = result.newState;

    // Award Fate Points
    if (result.fatePointsReward > 0) {
      // Add to global fate points (simplified - could be per-banner)
      const fatePoints = user.fatePoints || {};
      fatePoints.global = fatePoints.global || { points: 0 };
      fatePoints.global.points = (fatePoints.global.points || 0) + result.fatePointsReward;
      user.fatePoints = fatePoints;
    }

    // Award XP
    if (result.xpReward > 0) {
      user.accountXP = (user.accountXP || 0) + result.xpReward;
    }

    await user.save();

    res.json({
      success: true,
      shardsEarned: result.shardsEarned,
      totalShards: result.totalShards,
      prestigeLevel: result.prestigeLevel,
      fatePointsReward: result.fatePointsReward,
      xpReward: result.xpReward,
      startingEssence: result.startingEssence
    });
  } catch (error) {
    console.error('Error performing prestige:', error);
    res.status(500).json({ error: 'Failed to prestige' });
  }
});

/**
 * POST /api/essence-tap/prestige/upgrade
 * Purchase a prestige upgrade
 */
router.post('/prestige/upgrade', auth, async (req, res) => {
  try {
    const { upgradeId } = req.body;

    if (!upgradeId) {
      return res.status(400).json({ error: 'Upgrade ID required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.purchasePrestigeUpgrade(state, upgradeId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();

    user.essenceTap = result.newState;
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

/**
 * POST /api/essence-tap/milestone/claim
 * Claim a Fate Points milestone
 */
router.post('/milestone/claim', auth, async (req, res) => {
  try {
    const { milestoneKey } = req.body;

    if (!milestoneKey) {
      return res.status(400).json({ error: 'Milestone key required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.claimMilestone(state, milestoneKey);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();

    user.essenceTap = result.newState;

    // Award Fate Points
    if (result.fatePoints > 0) {
      const fatePoints = user.fatePoints || {};
      fatePoints.global = fatePoints.global || { points: 0 };
      fatePoints.global.points = (fatePoints.global.points || 0) + result.fatePoints;
      user.fatePoints = fatePoints;
    }

    await user.save();

    res.json({
      success: true,
      fatePoints: result.fatePoints
    });
  } catch (error) {
    console.error('Error claiming milestone:', error);
    res.status(500).json({ error: 'Failed to claim milestone' });
  }
});

/**
 * POST /api/essence-tap/character/assign
 * Assign a character for production bonus
 */
router.post('/character/assign', auth, async (req, res) => {
  try {
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({ error: 'Character ID required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's characters
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: user.id },
      include: ['Character']
    });

    const ownedCharacters = userCharacters.map(uc => ({
      id: uc.CharacterId,
      rarity: uc.Character?.rarity || 'common',
      element: uc.Character?.element || 'neutral'
    }));

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.assignCharacter(state, characterId, ownedCharacters);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();

    user.essenceTap = result.newState;
    await user.save();

    // Calculate new bonuses
    const ownedCharsWithSeries = userCharacters.map(uc => ({
      id: uc.CharacterId,
      rarity: uc.Character?.rarity || 'common',
      element: uc.Character?.element || 'neutral',
      series: uc.Character?.series || 'Unknown'
    }));

    const characterBonus = essenceTapService.calculateCharacterBonus(result.newState, ownedCharacters);
    const elementBonuses = essenceTapService.calculateElementBonuses(result.newState, ownedCharacters);
    const elementSynergy = essenceTapService.calculateElementSynergy(result.newState, ownedCharacters);
    const seriesSynergy = essenceTapService.calculateSeriesSynergy(result.newState, ownedCharsWithSeries);
    const masteryBonus = essenceTapService.calculateTotalMasteryBonus(result.newState);
    const underdogBonus = essenceTapService.calculateUnderdogBonus(result.newState, ownedCharacters);

    res.json({
      success: true,
      assignedCharacters: result.newState.assignedCharacters,
      characterBonus,
      elementBonuses,
      elementSynergy,
      seriesSynergy,
      masteryBonus,
      underdogBonus
    });
  } catch (error) {
    console.error('Error assigning character:', error);
    res.status(500).json({ error: 'Failed to assign character' });
  }
});

/**
 * POST /api/essence-tap/character/unassign
 * Unassign a character
 */
router.post('/character/unassign', auth, async (req, res) => {
  try {
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({ error: 'Character ID required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.unassignCharacter(state, characterId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();

    user.essenceTap = result.newState;
    await user.save();

    // Get user's characters for bonus calculation
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: user.id },
      include: ['Character']
    });

    const ownedCharacters = userCharacters.map(uc => ({
      id: uc.CharacterId,
      rarity: uc.Character?.rarity || 'common',
      element: uc.Character?.element || 'neutral',
      series: uc.Character?.series || 'Unknown'
    }));

    const characterBonus = essenceTapService.calculateCharacterBonus(result.newState, ownedCharacters);
    const elementBonuses = essenceTapService.calculateElementBonuses(result.newState, ownedCharacters);
    const elementSynergy = essenceTapService.calculateElementSynergy(result.newState, ownedCharacters);
    const seriesSynergy = essenceTapService.calculateSeriesSynergy(result.newState, ownedCharacters);
    const masteryBonus = essenceTapService.calculateTotalMasteryBonus(result.newState);
    const underdogBonus = essenceTapService.calculateUnderdogBonus(result.newState, ownedCharacters);

    res.json({
      success: true,
      assignedCharacters: result.newState.assignedCharacters,
      characterBonus,
      elementBonuses,
      elementSynergy,
      seriesSynergy,
      masteryBonus,
      underdogBonus
    });
  } catch (error) {
    console.error('Error unassigning character:', error);
    res.status(500).json({ error: 'Failed to unassign character' });
  }
});

/**
 * POST /api/essence-tap/save
 * Save current game state (for periodic auto-save)
 * NOTE: Server recalculates essence based on production rate for security
 */
router.post('/save', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    // Get user's characters for calculation
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: user.id },
      include: ['Character']
    });

    const characters = userCharacters.map(uc => ({
      id: uc.CharacterId,
      rarity: uc.Character?.rarity || 'common',
      element: uc.Character?.element || 'neutral'
    }));

    // Calculate expected essence gain since last save (server-side validation)
    const now = Date.now();
    const lastSave = state.lastSaveTimestamp || state.lastOnlineTimestamp || now;
    const elapsedSeconds = Math.min((now - lastSave) / 1000, 300); // Max 5 minutes between saves

    // Calculate production (with active abilities)
    const activeAbilityEffects = essenceTapService.getActiveAbilityEffects(state);
    let productionPerSecond = essenceTapService.calculateProductionPerSecond(state, characters);
    if (activeAbilityEffects.productionMultiplier) {
      productionPerSecond *= activeAbilityEffects.productionMultiplier;
    }

    const expectedGain = Math.floor(productionPerSecond * elapsedSeconds);
    state.essence = (state.essence || 0) + expectedGain;
    state.lifetimeEssence = (state.lifetimeEssence || 0) + expectedGain;

    // Update weekly tournament progress
    if (expectedGain > 0) {
      state = essenceTapService.updateWeeklyProgress(state, expectedGain);
    }

    // Award character XP for essence earned
    if (expectedGain > 0) {
      const xpResult = essenceTapService.awardCharacterXP(state, expectedGain);
      state = xpResult.newState;
    }

    // Update character mastery (time-based)
    const elapsedHours = elapsedSeconds / 3600;
    if (elapsedHours > 0) {
      const masteryResult = essenceTapService.updateCharacterMastery(state, elapsedHours);
      state = masteryResult.newState;
    }

    // Track essence types from production (generators produce ambient essence)
    if (expectedGain > 0) {
      const essenceTypes = { pure: 0, ambient: expectedGain, golden: 0, prismatic: 0 };
      state = essenceTapService.updateEssenceTypes(state, essenceTypes);
    }

    state.lastOnlineTimestamp = now;
    state.lastSaveTimestamp = now;

    user.essenceTap = state;
    await user.save();

    res.json({
      success: true,
      savedAt: state.lastSaveTimestamp,
      essenceGained: expectedGain,
      essence: state.essence,
      lifetimeEssence: state.lifetimeEssence
    });
  } catch (error) {
    console.error('Error saving state:', error);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// ===========================================
// GAMBLE SYSTEM ROUTES
// ===========================================

/**
 * POST /api/essence-tap/gamble
 * Perform a gamble with essence
 */
router.post('/gamble', auth, async (req, res) => {
  try {
    const { betType, betAmount } = req.body;

    if (!betType || betAmount === undefined) {
      return res.status(400).json({ error: 'Bet type and amount required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();
    state = essenceTapService.resetDaily(state);

    const result = essenceTapService.performGamble(state, betType, betAmount);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Contribute to jackpot from bet
    const jackpotContribution = essenceTapService.contributeToJackpot(result.newState, betAmount);
    result.newState = jackpotContribution.newState;

    // Check for jackpot win
    let jackpotWin = null;
    const jackpotResult = essenceTapService.checkJackpotWin(result.newState, betAmount);
    if (jackpotResult.won) {
      jackpotWin = jackpotResult.amount;
      result.newState.essence = (result.newState.essence || 0) + jackpotResult.amount;
      result.newState.lifetimeEssence = (result.newState.lifetimeEssence || 0) + jackpotResult.amount;
      result.newState.stats = {
        ...result.newState.stats,
        totalJackpotWinnings: (result.newState.stats?.totalJackpotWinnings || 0) + jackpotResult.amount
      };
      result.newState = essenceTapService.resetJackpot(result.newState);
    }

    result.newState.lastOnlineTimestamp = Date.now();

    user.essenceTap = result.newState;
    await user.save();

    res.json({
      success: true,
      won: result.won,
      betAmount: result.betAmount,
      betType: result.betType,
      multiplier: result.multiplier,
      winChance: result.winChance,
      essenceChange: result.essenceChange,
      newEssence: result.newState.essence,
      jackpotWin,
      jackpotContribution: jackpotContribution.contribution,
      gambleInfo: essenceTapService.getGambleInfo(result.newState),
      jackpotInfo: essenceTapService.getJackpotInfo(result.newState)
    });
  } catch (error) {
    console.error('Error performing gamble:', error);
    res.status(500).json({ error: 'Failed to gamble' });
  }
});

// ===========================================
// INFUSION SYSTEM ROUTES
// ===========================================

/**
 * POST /api/essence-tap/infusion
 * Perform an essence infusion for permanent bonus
 */
router.post('/infusion', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.performInfusion(state);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();

    user.essenceTap = result.newState;
    await user.save();

    res.json({
      success: true,
      cost: result.cost,
      costPercent: result.costPercent,
      bonusGained: result.bonusGained,
      totalBonus: result.totalBonus,
      infusionCount: result.infusionCount,
      nextCost: essenceTapService.calculateInfusionCost(result.newState),
      essence: result.newState.essence
    });
  } catch (error) {
    console.error('Error performing infusion:', error);
    res.status(500).json({ error: 'Failed to infuse' });
  }
});

// ===========================================
// ACTIVE ABILITIES ROUTES
// ===========================================

/**
 * POST /api/essence-tap/ability/activate
 * Activate an ability
 */
router.post('/ability/activate', auth, async (req, res) => {
  try {
    const { abilityId } = req.body;

    if (!abilityId) {
      return res.status(400).json({ error: 'Ability ID required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.activateAbility(state, abilityId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();

    user.essenceTap = result.newState;
    await user.save();

    res.json({
      success: true,
      ability: result.ability,
      duration: result.duration,
      effects: result.effects,
      bonusEssence: result.bonusEssence,
      essence: result.newState.essence,
      activeAbilities: essenceTapService.getActiveAbilitiesInfo(result.newState)
    });
  } catch (error) {
    console.error('Error activating ability:', error);
    res.status(500).json({ error: 'Failed to activate ability' });
  }
});

/**
 * GET /api/essence-tap/daily-modifier
 * Get current daily modifier info
 */
router.get('/daily-modifier', auth, async (req, res) => {
  try {
    const modifier = essenceTapService.getCurrentDailyModifier();
    const nextChangeIn = essenceTapService.getTimeUntilNextModifier();

    res.json({
      ...modifier,
      nextChangeIn
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

    const state = user.essenceTap || essenceTapService.getInitialState();
    const claimable = essenceTapService.checkRepeatableMilestones(state);

    res.json({
      claimable,
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
  try {
    const { milestoneType } = req.body;

    if (!milestoneType) {
      return res.status(400).json({ error: 'Milestone type required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.claimRepeatableMilestone(state, milestoneType);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();
    user.essenceTap = result.newState;

    // Award Fate Points
    if (result.fatePoints > 0) {
      const fatePoints = user.fatePoints || {};
      fatePoints.global = fatePoints.global || { points: 0 };
      fatePoints.global.points = (fatePoints.global.points || 0) + result.fatePoints;
      user.fatePoints = fatePoints;
    }

    await user.save();

    res.json({
      success: true,
      fatePoints: result.fatePoints,
      count: result.count || 1
    });
  } catch (error) {
    console.error('Error claiming repeatable milestone:', error);
    res.status(500).json({ error: 'Failed to claim milestone' });
  }
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

    const state = user.essenceTap || essenceTapService.getInitialState();
    const tournamentInfo = essenceTapService.getWeeklyTournamentInfo(state);

    res.json(tournamentInfo);
  } catch (error) {
    console.error('Error getting tournament info:', error);
    res.status(500).json({ error: 'Failed to get tournament info' });
  }
});

/**
 * POST /api/essence-tap/tournament/weekly/claim
 * Claim weekly tournament rewards
 */
router.post('/tournament/weekly/claim', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.claimWeeklyRewards(state);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();
    user.essenceTap = result.newState;

    // Award Fate Points
    if (result.rewards.fatePoints > 0) {
      const fatePoints = user.fatePoints || {};
      fatePoints.global = fatePoints.global || { points: 0 };
      fatePoints.global.points = (fatePoints.global.points || 0) + result.rewards.fatePoints;
      user.fatePoints = fatePoints;
    }

    // Award Roll Tickets
    if (result.rewards.rollTickets > 0) {
      user.rollTickets = (user.rollTickets || 0) + result.rewards.rollTickets;
    }

    await user.save();

    res.json({
      success: true,
      tier: result.tier,
      rewards: result.rewards
    });
  } catch (error) {
    console.error('Error claiming weekly rewards:', error);
    res.status(500).json({ error: 'Failed to claim rewards' });
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

    const state = user.essenceTap || essenceTapService.getInitialState();
    const streakInfo = essenceTapService.checkDailyStreakTickets(state);

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
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.checkDailyStreakTickets(state);

    if (!result.newState) {
      // Already claimed today
      return res.status(400).json({ error: result.reason || 'Already claimed today' });
    }

    result.newState.lastOnlineTimestamp = Date.now();
    user.essenceTap = result.newState;

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

/**
 * POST /api/essence-tap/tickets/exchange
 * Exchange Fate Points for roll tickets
 */
router.post('/tickets/exchange', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    // Get user's Fate Points
    const fatePoints = user.fatePoints?.global?.points || 0;

    const result = essenceTapService.exchangeFatePointsForTickets(state, fatePoints);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();
    user.essenceTap = result.newState;

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

    const state = user.essenceTap || essenceTapService.getInitialState();
    const masteryInfo = {};

    for (const charId of state.assignedCharacters || []) {
      masteryInfo[charId] = essenceTapService.calculateCharacterMastery(state, charId);
    }

    const totalBonus = essenceTapService.calculateTotalMasteryBonus(state);

    res.json({
      characterMastery: masteryInfo,
      totalBonus,
      masteryConfig: essenceTapService.CHARACTER_MASTERY
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
 * Get jackpot info
 */
router.get('/jackpot', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || essenceTapService.getInitialState();
    const jackpotInfo = essenceTapService.getJackpotInfo(state);

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

    const state = user.essenceTap || essenceTapService.getInitialState();

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

    const seriesSynergy = essenceTapService.calculateSeriesSynergy(state, characters);

    res.json({
      ...seriesSynergy,
      config: essenceTapService.SERIES_SYNERGIES
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

    const state = user.essenceTap || essenceTapService.getInitialState();
    const essenceTypes = state.essenceTypes || { pure: 0, ambient: 0, golden: 0, prismatic: 0 };
    const bonuses = essenceTapService.getEssenceTypeBonuses(state);

    res.json({
      essenceTypes,
      bonuses,
      config: essenceTapService.ESSENCE_TYPES
    });
  } catch (error) {
    console.error('Error getting essence types:', error);
    res.status(500).json({ error: 'Failed to get essence types' });
  }
});

module.exports = router;
