/**
 * Ticket & Essence Routes
 *
 * Handles ticket generation (streak claiming, FP exchange),
 * essence types, daily modifiers, and infusion.
 * Uses unified action handlers and middleware.
 */

const express = require('express');
const router = express.Router();

const { actions } = require('../../../services/essenceTap');
const config = require('../../../config/essenceTap');
const {
  loadGameState,
  applyPassiveGains,
  saveGameState,
  asyncHandler,
  awardTickets
} = require('../middleware');

// ===========================================
// TICKET GENERATION
// ===========================================

/**
 * POST /tickets/streak/claim
 * Claim daily streak and potentially earn tickets
 */
router.post('/streak/claim',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    const result = actions.claimDailyStreak({ state: req.gameState });

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Already claimed today',
        code: result.code
      });
    }

    // Award tickets if applicable
    if (result.awarded && result.tickets > 0) {
      awardTickets({
        user: req.gameUser,
        amount: result.tickets
      });
    }

    // Update state for saving
    req.gameState = result.newState;
    req.gameStateChanged = true;

    // Set response
    res.locals.response = {
      success: true,
      awarded: result.awarded,
      tickets: result.tickets || 0,
      streakDays: result.streakDays,
      nextMilestone: result.nextMilestone
    };

    next();
  }),
  saveGameState
);

/**
 * GET /tickets/info
 * Get ticket generation info
 */
router.get('/info',
  loadGameState,
  asyncHandler(async (req, res) => {
    const info = actions.getTicketGenerationInfo(req.gameState);
    return res.json(info);
  })
);

// ===========================================
// ESSENCE TYPES & MODIFIERS
// ===========================================

/**
 * GET /essence-types
 * Get essence type breakdown and bonuses
 */
router.get('/essence-types',
  loadGameState,
  asyncHandler(async (req, res) => {
    const state = req.gameState;
    const essenceTypes = state.essenceTypes || { pure: 0, ambient: 0, golden: 0, prismatic: 0 };

    // Calculate bonuses based on essence type distribution
    const totalEssence = Object.values(essenceTypes).reduce((sum, val) => sum + val, 0);
    const bonuses = {};

    if (totalEssence > 0) {
      const essenceTypeConfig = config.ESSENCE_TYPES || {};
      for (const [type, amount] of Object.entries(essenceTypes)) {
        const typeConfig = essenceTypeConfig[type];
        if (typeConfig && typeConfig.bonus) {
          const percentage = amount / totalEssence;
          bonuses[type] = {
            percentage: percentage * 100,
            bonus: typeConfig.bonus * (amount / 1000000), // Scale by amount
            description: typeConfig.description
          };
        }
      }
    }

    return res.json({
      essenceTypes,
      bonuses,
      config: config.ESSENCE_TYPES
    });
  })
);

/**
 * GET /daily-modifier
 * Get current daily modifier info
 */
router.get('/daily-modifier',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

    // Get modifiers config
    const modifiers = config.DAILY_MODIFIERS || [];
    const modifierIndex = dayOfYear % modifiers.length;
    const currentModifier = modifiers[modifierIndex] || {
      id: 'none',
      name: 'Normal Day',
      description: 'No special modifier today',
      multiplier: 1
    };

    // Calculate time until next modifier (midnight UTC)
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    const nextChangeIn = tomorrow.getTime() - now.getTime();

    res.json({
      ...currentModifier,
      nextChangeIn
    });
  })
);

// ===========================================
// INFUSION
// ===========================================

/**
 * POST /infusion
 * Perform an essence infusion for permanent bonus
 */
router.post('/infusion',
  loadGameState,
  applyPassiveGains,
  asyncHandler(async (req, res, next) => {
    const result = actions.performInfusion({ state: req.gameState });

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
      cost: result.cost,
      costPercent: result.costPercent,
      bonusGained: result.bonusGained,
      totalBonus: result.totalBonus,
      infusionCount: result.infusionCount,
      nextCost: actions.getInfusionInfo(result.newState).nextCost,
      essence: result.newState.essence
    };

    next();
  }),
  saveGameState
);

/**
 * GET /infusion/info
 * Get infusion information
 */
router.get('/infusion/info',
  loadGameState,
  asyncHandler(async (req, res) => {
    const info = actions.getInfusionInfo(req.gameState);
    return res.json(info);
  })
);

module.exports = router;
