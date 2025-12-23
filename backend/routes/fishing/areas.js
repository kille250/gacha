/**
 * Fishing Areas Routes
 * 
 * Handles: /areas, /areas/:id/unlock, /areas/:id/select
 * Fishing location management.
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { enforcementMiddleware } = require('../../middleware/enforcement');
const { deviceBindingMiddleware } = require('../../middleware/deviceBinding');
const { User } = require('../../models');

// Config imports
const { FISHING_AREAS } = require('../../config/fishing');

// Service imports
const { getUserRank } = require('../../services/rankService');
const { updateRiskScore, buildRiskContext, RISK_ACTIONS } = require('../../services/riskService');

// Error classes
const {
  UserNotFoundError,
  InsufficientPointsError,
  AreaError
} = require('../../errors/FishingErrors');

// GET / - Get available fishing areas
// Security: enforcement checked (banned users cannot access game features)
router.get('/', [auth, enforcementMiddleware], async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const userAreas = user.fishingAreas || { unlocked: ['pond'], current: 'pond' };
    const rank = await getUserRank(req.user.id);
    
    const areasInfo = Object.values(FISHING_AREAS).map(area => ({
      ...area,
      unlocked: userAreas.unlocked.includes(area.id),
      current: userAreas.current === area.id,
      canUnlock: !userAreas.unlocked.includes(area.id) && 
                 user.points >= area.unlockCost &&
                 (!area.unlockRank || rank <= area.unlockRank)
    }));
    
    res.json({
      areas: areasInfo,
      current: userAreas.current,
      userRank: rank
    });
  } catch (err) {
    next(err);
  }
});

// POST /:id/unlock - Unlock a fishing area
// Security: enforcement checked, device binding verified, risk tracked
router.post('/:id/unlock', [auth, enforcementMiddleware, deviceBindingMiddleware('fishing_purchase')], async (req, res, next) => {
  try {
    const { id: areaId } = req.params;
    const area = FISHING_AREAS[areaId];
    
    if (!area) throw new AreaError('not_found');
    
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const userAreas = user.fishingAreas || { unlocked: ['pond'], current: 'pond' };
    
    if (userAreas.unlocked.includes(areaId)) {
      throw new AreaError('already_unlocked');
    }
    
    // Rank check
    if (area.unlockRank) {
      const rank = await getUserRank(req.user.id);
      if (rank > area.unlockRank) {
        throw new AreaError('rank_required', { 
          required: area.unlockRank, 
          current: rank 
        });
      }
    }
    
    // Cost check
    if (user.points < area.unlockCost) {
      throw new InsufficientPointsError(area.unlockCost, user.points);
    }
    
    // Unlock
    user.points -= area.unlockCost;
    userAreas.unlocked.push(areaId);
    userAreas.current = areaId;
    user.fishingAreas = userAreas;
    
    await user.save();
    
    // SECURITY: Track area unlock for risk scoring (point spending)
    await updateRiskScore(req.user.id, buildRiskContext(req, RISK_ACTIONS.FISHING_AREA_PURCHASE, 'area_unlock_purchase'));
    
    res.json({
      success: true,
      area: area.name,
      newPoints: user.points,
      message: `Unlocked ${area.name}! 🎉`
    });
  } catch (err) {
    next(err);
  }
});

// POST /:id/select - Select a fishing area
// Security: enforcement checked (banned users cannot change areas)
router.post('/:id/select', [auth, enforcementMiddleware], async (req, res, next) => {
  try {
    const { id: areaId } = req.params;
    
    if (!FISHING_AREAS[areaId]) {
      throw new AreaError('not_found');
    }
    
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const userAreas = user.fishingAreas || { unlocked: ['pond'], current: 'pond' };
    
    if (!userAreas.unlocked.includes(areaId)) {
      throw new AreaError('not_unlocked');
    }
    
    userAreas.current = areaId;
    user.fishingAreas = userAreas;
    await user.save();
    
    res.json({
      success: true,
      current: areaId,
      area: FISHING_AREAS[areaId]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

