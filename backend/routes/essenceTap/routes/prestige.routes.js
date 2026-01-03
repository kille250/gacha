/**
 * Prestige Routes
 *
 * Handles prestige (awakening) system:
 * - POST /prestige - Perform prestige/awakening
 * - GET /prestige/info - Get prestige information
 * - POST /prestige/upgrade - Purchase prestige upgrade
 *
 * Uses unified action handlers and middleware.
 */

const express = require('express');
const router = express.Router();

const { actions } = require('../../../services/essenceTap');
const {
  loadGameState,
  saveGameState,
  asyncHandler,
  awardFP
} = require('../middleware');

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /prestige
 * Perform prestige (awakening) to reset and gain prestige shards
 */
router.post('/',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    // Use unified action handler
    const result = actions.performPrestige({
      state: req.gameState
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    // Apply FP with cap enforcement
    let actualFP = 0;
    let fpCapped = false;
    if (result.fatePointsReward > 0) {
      const fpResult = awardFP({
        user: req.gameUser,
        state: result.newState,
        amount: result.fatePointsReward,
        source: 'prestige'
      });
      result.newState = fpResult.newState;
      actualFP = fpResult.actualFP;
      fpCapped = fpResult.capped;
      req.gameUser.fatePoints = fpResult.fatePoints;
    }

    // Award XP
    if (result.xpReward > 0) {
      req.gameUser.accountXP = (req.gameUser.accountXP || 0) + result.xpReward;
    }

    // Update state for saving
    req.gameState = result.newState;
    req.gameStateChanged = true;

    // Set response
    res.locals.response = {
      success: true,
      shardsEarned: result.shardsEarned,
      totalShards: result.totalShards,
      prestigeLevel: result.prestigeLevel,
      fatePointsReward: actualFP,
      fatePointsCapped: fpCapped,
      xpReward: result.xpReward,
      startingEssence: result.startingEssence,
      prestigeMultiplier: result.prestigeMultiplier
    };

    next();
  }),
  saveGameState
);

/**
 * GET /prestige/info
 * Get prestige information (shards, level, upgrades, next prestige preview)
 */
router.get('/info',
  loadGameState,
  asyncHandler(async (req, res) => {
    const preview = actions.getPrestigePreview(req.gameState);
    const canPrestige = actions.canPrestige(req.gameState);

    return res.json({
      ...preview,
      canPrestige,
      prestigeShards: req.gameState.prestigeShards || 0,
      prestigeLevel: req.gameState.prestigeLevel || 0
    });
  })
);

/**
 * POST /prestige/upgrade
 * Purchase a prestige upgrade
 */
router.post('/upgrade',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    const { upgradeId } = req.body;

    if (!upgradeId) {
      return res.status(400).json({ error: 'Upgrade ID required' });
    }

    // Use unified action handler
    const result = actions.purchasePrestigeUpgrade({
      state: req.gameState,
      upgradeId
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    // Update state for saving
    req.gameState = result.newState;
    req.gameStateChanged = true;

    // Set response
    res.locals.response = {
      success: true,
      upgrade: result.upgrade,
      newLevel: result.newLevel,
      cost: result.cost,
      remainingShards: result.newState.prestigeShards
    };

    next();
  }),
  saveGameState
);

module.exports = router;
