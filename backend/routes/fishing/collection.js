/**
 * Fishing Collection Routes
 * 
 * Handles: /collection, /collection/rewards
 * Fish collection/codex system for long-term progression.
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { enforcementMiddleware } = require('../../middleware/enforcement');
const { User } = require('../../models');

const { FISH_TYPES } = require('../../config/fishing');

const {
  buildCollectionData,
  getCollectionBonuses,
  COLLECTION_MILESTONES,
  TOTAL_STAR_MILESTONES,
  RARITY_COMPLETION_BONUSES
} = require('../../config/fishing/collection');

const { UserNotFoundError } = require('../../errors/FishingErrors');

// GET /collection - Get full collection/codex data
// Security: enforcement checked (banned users cannot access game features)
router.get('/', [auth, enforcementMiddleware], async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);

    const stats = user.fishingStats || {};
    const fishCaught = stats.fishCaught || {};

    // Build full collection data
    const collection = buildCollectionData(fishCaught, FISH_TYPES);

    // Get current bonuses
    const bonuses = getCollectionBonuses(collection);

    // Format fish by rarity for frontend
    const fishByRarity = {
      common: [],
      uncommon: [],
      rare: [],
      epic: [],
      legendary: []
    };

    for (const [_fishId, data] of Object.entries(collection.fish)) {
      if (fishByRarity[data.rarity]) {
        fishByRarity[data.rarity].push(data);
      }
    }

    res.json({
      totalUnique: collection.totalUnique,
      totalPossible: FISH_TYPES.length,
      totalStars: collection.totalStars,
      maxPossibleStars: collection.maxPossibleStars,
      completionPercent: collection.completionPercent,
      byRarity: collection.byRarity,
      fishByRarity,
      rarityBonuses: collection.rarityBonuses,
      activeBonuses: bonuses,
      // Milestones info
      milestones: {
        collection: Object.entries(COLLECTION_MILESTONES).map(([threshold, data]) => ({
          threshold: parseInt(threshold),
          ...data,
          achieved: collection.totalUnique >= parseInt(threshold)
        })),
        stars: Object.entries(TOTAL_STAR_MILESTONES).map(([threshold, data]) => ({
          threshold: parseInt(threshold),
          ...data,
          achieved: collection.totalStars >= parseInt(threshold)
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /collection/fish/:fishId - Get details for a specific fish
// Security: enforcement checked (banned users cannot access game features)
router.get('/fish/:fishId', [auth, enforcementMiddleware], async (req, res, next) => {
  try {
    const { fishId } = req.params;
    
    const fishType = FISH_TYPES.find(f => f.id === fishId);
    if (!fishType) {
      return res.status(404).json({ error: 'FISH_NOT_FOUND', message: 'Fish type not found' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);

    const stats = user.fishingStats || {};
    const quantity = stats.fishCaught?.[fishId] || 0;
    const collection = buildCollectionData(stats.fishCaught || {}, FISH_TYPES);
    const fishData = collection.fish[fishId];

    res.json({
      fish: fishType,
      caught: quantity > 0,
      quantity,
      stars: fishData?.stars || 0,
      progress: fishData?.progress || { current: 0, needed: 1, percent: 0, maxed: false },
      // Show what bonus this fish contributes to
      rarityBonus: RARITY_COMPLETION_BONUSES[fishType.rarity]
    });
  } catch (err) {
    next(err);
  }
});

// GET /collection/bonuses - Get all active collection bonuses
// Security: enforcement checked (banned users cannot access game features)
router.get('/bonuses', [auth, enforcementMiddleware], async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);

    const stats = user.fishingStats || {};
    const collection = buildCollectionData(stats.fishCaught || {}, FISH_TYPES);
    const bonuses = getCollectionBonuses(collection);

    // Show which bonuses are active and which are locked
    const allRarityBonuses = Object.entries(RARITY_COMPLETION_BONUSES).map(([rarity, bonus]) => ({
      rarity,
      ...bonus,
      unlocked: !!collection.rarityBonuses[rarity],
      progress: {
        current: collection.byRarity[rarity]?.stars || 0,
        required: collection.byRarity[rarity]?.maxStars || 0
      }
    }));

    res.json({
      activeBonuses: bonuses,
      rarityBonuses: allRarityBonuses,
      collectionProgress: {
        unique: collection.totalUnique,
        total: FISH_TYPES.length,
        stars: collection.totalStars,
        maxStars: collection.maxPossibleStars
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /collection/claim-milestone - Claim a collection milestone reward
// Security: enforcement checked (banned users cannot claim rewards)
router.post('/claim-milestone', [auth, enforcementMiddleware], async (req, res, next) => {
  try {
    const { type, threshold } = req.body;
    
    if (!type || !threshold) {
      return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Type and threshold required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);

    const stats = user.fishingStats || {};
    const collection = buildCollectionData(stats.fishCaught || {}, FISH_TYPES);
    const achievements = user.fishingAchievements || {};

    // Get milestone data
    const milestones = type === 'collection' ? COLLECTION_MILESTONES : TOTAL_STAR_MILESTONES;
    const milestone = milestones[threshold];

    if (!milestone) {
      return res.status(404).json({ error: 'MILESTONE_NOT_FOUND', message: 'Invalid milestone' });
    }

    // Check if eligible
    const currentValue = type === 'collection' ? collection.totalUnique : collection.totalStars;
    if (currentValue < threshold) {
      return res.status(400).json({ 
        error: 'MILESTONE_NOT_REACHED', 
        message: `Need ${threshold - currentValue} more ${type === 'collection' ? 'unique fish' : 'stars'}` 
      });
    }

    // Check if already claimed
    const claimedKey = `milestone_${type}_${threshold}`;
    const claimedMilestones = achievements.claimedMilestones || {};
    if (claimedMilestones[claimedKey]) {
      return res.status(400).json({ error: 'ALREADY_CLAIMED', message: 'Milestone already claimed' });
    }

    // Apply rewards
    const reward = milestone.reward;
    if (reward.points) {
      user.points = (user.points || 0) + reward.points;
    }
    if (reward.rollTickets) {
      user.rollTickets = (user.rollTickets || 0) + reward.rollTickets;
    }
    if (reward.premiumTickets) {
      user.premiumTickets = (user.premiumTickets || 0) + reward.premiumTickets;
    }

    // Mark as claimed
    claimedMilestones[claimedKey] = new Date().toISOString();
    achievements.claimedMilestones = claimedMilestones;
    user.fishingAchievements = achievements;

    await user.save();

    res.json({
      success: true,
      milestone: milestone.name || `${type} milestone`,
      reward,
      newPoints: user.points,
      newTickets: {
        rollTickets: user.rollTickets || 0,
        premiumTickets: user.premiumTickets || 0
      },
      message: `🏆 ${milestone.name || 'Milestone'} claimed!`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

