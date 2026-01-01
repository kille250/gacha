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
      rarity: uc.Character?.rarity || 'common'
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

    // Rate limit clicks
    const clickCount = Math.min(Math.max(1, count), essenceTapService.GAME_CONFIG.maxClicksPerSecond);

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
      rarity: uc.Character?.rarity || 'common'
    }));

    // Process clicks
    let totalEssence = 0;
    let totalCrits = 0;
    let goldenClicks = 0;

    for (let i = 0; i < clickCount; i++) {
      const result = essenceTapService.processClick(state, characters, comboMultiplier);
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
      rarity: uc.Character?.rarity || 'common'
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
      rarity: uc.Character?.rarity || 'common'
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
      rarity: uc.Character?.rarity || 'common'
    }));

    let state = user.essenceTap || essenceTapService.getInitialState();

    const result = essenceTapService.assignCharacter(state, characterId, ownedCharacters);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    result.newState.lastOnlineTimestamp = Date.now();

    user.essenceTap = result.newState;
    await user.save();

    // Calculate new bonus
    const characterBonus = essenceTapService.calculateCharacterBonus(result.newState, ownedCharacters);

    res.json({
      success: true,
      assignedCharacters: result.newState.assignedCharacters,
      characterBonus
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
      rarity: uc.Character?.rarity || 'common'
    }));

    const characterBonus = essenceTapService.calculateCharacterBonus(result.newState, ownedCharacters);

    res.json({
      success: true,
      assignedCharacters: result.newState.assignedCharacters,
      characterBonus
    });
  } catch (error) {
    console.error('Error unassigning character:', error);
    res.status(500).json({ error: 'Failed to unassign character' });
  }
});

/**
 * POST /api/essence-tap/save
 * Save current game state (for periodic auto-save)
 */
router.post('/save', auth, async (req, res) => {
  try {
    const { essence, lifetimeEssence } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || essenceTapService.getInitialState();

    // Only update essence values if they're higher (prevent cheating by lowering values)
    if (essence !== undefined && essence >= (state.essence || 0)) {
      state.essence = essence;
    }
    if (lifetimeEssence !== undefined && lifetimeEssence >= (state.lifetimeEssence || 0)) {
      state.lifetimeEssence = lifetimeEssence;
    }

    state.lastOnlineTimestamp = Date.now();
    state.lastSaveTimestamp = Date.now();

    user.essenceTap = state;
    await user.save();

    res.json({ success: true, savedAt: state.lastSaveTimestamp });
  } catch (error) {
    console.error('Error saving state:', error);
    res.status(500).json({ error: 'Failed to save' });
  }
});

module.exports = router;
