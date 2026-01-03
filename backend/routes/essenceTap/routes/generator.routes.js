/**
 * Generator Routes
 *
 * Handles generator purchases and information:
 * - POST /generator/buy - Purchase generators
 * - GET /generator/info - Get generator information
 *
 * Uses unified action handlers and middleware.
 */

const express = require('express');
const router = express.Router();

const { actions } = require('../../../services/essenceTap');
const {
  loadGameState,
  applyPassiveGains,
  saveGameState,
  asyncHandler
} = require('../middleware');

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /generator/buy
 * Purchase one or more generators
 */
router.post('/buy',
  loadGameState,
  applyPassiveGains,
  asyncHandler(async (req, res, next) => {
    const { generatorId, count = 1 } = req.body;

    if (!generatorId) {
      return res.status(400).json({ error: 'Generator ID required' });
    }

    const parsedCount = count === 'max' ? 'max' : parseInt(count, 10);
    if (parsedCount !== 'max' && (isNaN(parsedCount) || parsedCount < 1)) {
      return res.status(400).json({ error: 'Invalid count' });
    }

    // Use unified action handler
    const result = actions.purchaseGenerator({
      state: req.gameState,
      generatorId,
      count: parsedCount
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
      generator: result.generator,
      newCount: result.newCount,
      cost: result.cost,
      essence: result.newState.essence
    };

    next();
  }),
  saveGameState
);

/**
 * GET /generator/info
 * Get available generators and current state
 */
router.get('/info',
  loadGameState,
  asyncHandler(async (req, res) => {
    const generators = actions.getAllGenerators(req.gameState);

    return res.json({
      generators,
      totalProduction: req.gameState.productionPerSecond || 0
    });
  })
);

/**
 * GET /generator/:id
 * Get specific generator information
 */
router.get('/:id',
  loadGameState,
  asyncHandler(async (req, res) => {
    const generatorId = req.params.id;
    const generatorInfo = actions.getGeneratorInfo(req.gameState, generatorId);

    if (!generatorInfo) {
      return res.status(404).json({ error: 'Generator not found' });
    }

    return res.json(generatorInfo);
  })
);

module.exports = router;
