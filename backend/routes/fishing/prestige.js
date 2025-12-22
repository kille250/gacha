/**
 * Fishing Prestige Routes
 * 
 * Handles: /prestige, /prestige/claim
 * Late-game progression system.
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { User } = require('../../models');

const {
  PRESTIGE_LEVELS,
  checkPrestigeRequirements,
  getPrestigeBonuses,
  getPrestigeProgress
} = require('../../config/fishing/prestige');

const {
  buildCollectionData,
  getCollectionBonuses
} = require('../../config/fishing/collection');

const { FISH_TYPES } = require('../../config/fishing');

const { UserNotFoundError } = require('../../errors/FishingErrors');

// GET /prestige - Get prestige status and progress
router.get('/', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);

    const achievements = user.fishingAchievements || {};
    const stats = user.fishingStats || {};
    const areas = user.fishingAreas || { unlocked: ['pond'] };
    const ownedRods = user.fishingOwnedRods || ['basic'];
    const currentPrestige = achievements.prestige || 0;

    // Get progress to next level
    const progress = getPrestigeProgress(achievements, stats, currentPrestige);

    // Get current bonuses
    const currentBonuses = getPrestigeBonuses(currentPrestige);

    // Check if can prestige to next level
    const nextLevel = currentPrestige + 1;
    const canPrestige = PRESTIGE_LEVELS[nextLevel] 
      ? checkPrestigeRequirements(achievements, stats, areas, ownedRods, nextLevel)
      : { canPrestige: false, missingRequirements: ['Maximum prestige reached'] };

    res.json({
      currentLevel: currentPrestige,
      currentName: PRESTIGE_LEVELS[currentPrestige]?.name || 'Novice Angler',
      currentEmoji: PRESTIGE_LEVELS[currentPrestige]?.emoji || '🎣',
      progress,
      currentBonuses,
      canPrestige: canPrestige.canPrestige,
      missingRequirements: canPrestige.missingRequirements,
      nextLevelRewards: PRESTIGE_LEVELS[nextLevel]?.rewards || null,
      allLevels: Object.entries(PRESTIGE_LEVELS).map(([level, data]) => ({
        level: parseInt(level),
        name: data.name,
        emoji: data.emoji,
        description: data.description,
        unlocked: parseInt(level) <= currentPrestige,
        current: parseInt(level) === currentPrestige,
        rewards: data.rewards
      }))
    });
  } catch (err) {
    next(err);
  }
});

// POST /prestige/claim - Claim next prestige level
router.post('/claim', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);

    const achievements = user.fishingAchievements || {};
    const stats = user.fishingStats || {};
    const areas = user.fishingAreas || { unlocked: ['pond'] };
    const ownedRods = user.fishingOwnedRods || ['basic'];
    const currentPrestige = achievements.prestige || 0;
    const nextLevel = currentPrestige + 1;

    // Check if max prestige
    if (!PRESTIGE_LEVELS[nextLevel]) {
      return res.status(400).json({
        error: 'MAX_PRESTIGE',
        message: 'You have reached maximum prestige level'
      });
    }

    // Check requirements
    const check = checkPrestigeRequirements(achievements, stats, areas, ownedRods, nextLevel);
    if (!check.canPrestige) {
      return res.status(400).json({
        error: 'REQUIREMENTS_NOT_MET',
        message: 'You do not meet the requirements for this prestige level',
        missingRequirements: check.missingRequirements
      });
    }

    const levelData = PRESTIGE_LEVELS[nextLevel];
    const rewards = levelData.rewards;

    // Apply rewards
    if (rewards.bonusPoints) {
      user.points = (user.points || 0) + rewards.bonusPoints;
    }

    // Update prestige level
    achievements.prestige = nextLevel;
    achievements.prestigeClaimedAt = new Date().toISOString();
    user.fishingAchievements = achievements;

    await user.save();

    // Get new cumulative bonuses
    const newBonuses = getPrestigeBonuses(nextLevel);

    res.json({
      success: true,
      newLevel: nextLevel,
      levelName: levelData.name,
      levelEmoji: levelData.emoji,
      rewards: rewards,
      newBonuses,
      newPoints: user.points,
      message: `🎉 Congratulations! You've reached ${levelData.name}!`
    });
  } catch (err) {
    next(err);
  }
});

// GET /prestige/bonuses - Get current active bonuses from prestige + collection
router.get('/bonuses', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);

    const achievements = user.fishingAchievements || {};
    const stats = user.fishingStats || {};
    const currentPrestige = achievements.prestige || 0;

    // Prestige bonuses
    const prestigeBonuses = getPrestigeBonuses(currentPrestige);

    // Collection bonuses
    const collection = buildCollectionData(stats.fishCaught || {}, FISH_TYPES);
    const collectionBonuses = getCollectionBonuses(collection);

    // Combine bonuses
    const totalBonuses = {
      timingBonus: prestigeBonuses.timingBonus + collectionBonuses.timingBonus,
      rarityBonus: prestigeBonuses.rarityBonus + collectionBonuses.rarityBonus,
      autofishLimit: prestigeBonuses.autofishLimit + collectionBonuses.autofishBonus,
      pityBonus: collectionBonuses.pityBonus,
      premiumTicketBonus: prestigeBonuses.premiumTicketBonus,
      autofishPerfectChance: prestigeBonuses.autofishPerfectChance,
      pityReduction: prestigeBonuses.pityReduction,
      unlocks: prestigeBonuses.unlocks
    };

    res.json({
      prestige: {
        level: currentPrestige,
        bonuses: prestigeBonuses
      },
      collection: {
        completion: collection.completionPercent,
        bonuses: collectionBonuses
      },
      total: totalBonuses
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

