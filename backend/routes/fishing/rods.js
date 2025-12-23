/**
 * Fishing Rods Routes
 * 
 * Handles: /rods, /rods/:id/buy, /rods/:id/equip
 * Fishing equipment management.
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { enforcementMiddleware } = require('../../middleware/enforcement');
const { User } = require('../../models');

// Config imports
const { FISHING_RODS } = require('../../config/fishing');

// Error classes
const {
  UserNotFoundError,
  InsufficientPointsError,
  RodError
} = require('../../errors/FishingErrors');

// GET / - Get available fishing rods
// Security: enforcement checked (banned users cannot access game features)
router.get('/', [auth, enforcementMiddleware], async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const currentRod = user.fishingRod || 'basic';
    const ownedRods = user.fishingOwnedRods || ['basic'];
    const prestige = user.fishingAchievements?.prestige || 0;
    
    const rodsInfo = Object.values(FISHING_RODS).map(rod => {
      const owned = ownedRods.includes(rod.id);
      const canBuy = !owned && 
                     user.points >= rod.cost &&
                     (!rod.requiresPrestige || prestige >= rod.requiresPrestige);
      
      return {
        ...rod,
        owned,
        equipped: currentRod === rod.id,
        canBuy,
        locked: rod.requiresPrestige && prestige < rod.requiresPrestige
      };
    });
    
    res.json({
      rods: rodsInfo,
      current: currentRod,
      ownedRods,
      prestige
    });
  } catch (err) {
    next(err);
  }
});

// POST /:id/buy - Buy a fishing rod
// Security: enforcement checked (banned users cannot buy rods)
router.post('/:id/buy', [auth, enforcementMiddleware], async (req, res, next) => {
  try {
    const { id: rodId } = req.params;
    const rod = FISHING_RODS[rodId];
    
    if (!rod) throw new RodError('not_found');
    
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const ownedRods = user.fishingOwnedRods || ['basic'];
    
    if (ownedRods.includes(rodId)) {
      throw new RodError('already_owned');
    }
    
    // Prestige check
    const prestige = user.fishingAchievements?.prestige || 0;
    if (rod.requiresPrestige && prestige < rod.requiresPrestige) {
      throw new RodError('prestige_required', { 
        required: rod.requiresPrestige, 
        current: prestige 
      });
    }
    
    // Cost check
    if (user.points < rod.cost) {
      throw new InsufficientPointsError(rod.cost, user.points);
    }
    
    // Buy and equip
    user.points -= rod.cost;
    ownedRods.push(rodId);
    user.fishingOwnedRods = ownedRods;
    user.fishingRod = rodId;
    await user.save();
    
    res.json({
      success: true,
      rod: rod.name,
      newPoints: user.points,
      ownedRods,
      message: `Purchased ${rod.name}! ${rod.emoji}`
    });
  } catch (err) {
    next(err);
  }
});

// POST /:id/equip - Equip an owned rod
// Security: enforcement checked (banned users cannot change equipment)
router.post('/:id/equip', [auth, enforcementMiddleware], async (req, res, next) => {
  try {
    const { id: rodId } = req.params;
    
    if (!FISHING_RODS[rodId]) {
      throw new RodError('not_found');
    }
    
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const ownedRods = user.fishingOwnedRods || ['basic'];
    if (!ownedRods.includes(rodId)) {
      throw new RodError('not_owned');
    }
    
    user.fishingRod = rodId;
    await user.save();
    
    res.json({
      success: true,
      current: rodId,
      rod: FISHING_RODS[rodId]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

