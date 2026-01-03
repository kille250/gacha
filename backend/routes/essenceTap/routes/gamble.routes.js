/**
 * Gamble Routes
 *
 * Handles gambling operations and jackpot information.
 * Uses unified action handlers and middleware.
 */

const express = require('express');
const router = express.Router();

const { actions } = require('../../../services/essenceTap');
const { SharedJackpot } = require('../../../models');
const {
  loadGameState,
  applyPassiveGains,
  saveGameState,
  asyncHandler
} = require('../middleware');

// ===========================================
// GAMBLING
// ===========================================

/**
 * POST /gamble
 * Perform a gamble with essence
 */
router.post('/',
  loadGameState,
  applyPassiveGains,
  asyncHandler(async (req, res, next) => {
    const { betAmount, betType } = req.body;

    if (!betAmount || betAmount < 1) {
      return res.status(400).json({ error: 'Invalid bet amount' });
    }
    if (!betType) {
      return res.status(400).json({ error: 'Bet type required' });
    }

    // Use unified action handler
    const result = await actions.performGamble({
      state: req.gameState,
      betAmount: parseInt(betAmount, 10),
      betType,
      userId: req.user.id
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
      won: result.won,
      betAmount: result.betAmount,
      betType: result.betType,
      multiplier: result.multiplier,
      winChance: result.winChance,
      essenceChange: result.essenceChange,
      newEssence: result.newEssence,
      jackpotWin: result.jackpotWin,
      gambleInfo: actions.getGambleInfo(result.newState)
    };

    next();
  }),
  saveGameState
);

/**
 * GET /info
 * Get gamble availability and info
 */
router.get('/info',
  loadGameState,
  asyncHandler(async (req, res) => {
    const gambleInfo = actions.getGambleInfo(req.gameState);
    return res.json(gambleInfo);
  })
);

// ===========================================
// JACKPOT INFO
// ===========================================

/**
 * GET /jackpot
 * Get shared jackpot info
 */
router.get('/jackpot',
  asyncHandler(async (req, res) => {
    const jackpot = await SharedJackpot.findOne({
      where: { jackpotType: 'essence_tap_main' }
    });

    if (!jackpot) {
      return res.json({
        currentAmount: 0,
        totalWins: 0,
        lastWinner: null
      });
    }

    return res.json({
      currentAmount: Number(jackpot.currentAmount),
      totalWins: jackpot.totalWins,
      lastWinner: jackpot.lastWinnerId,
      lastWinAmount: Number(jackpot.lastWinAmount),
      lastWinDate: jackpot.lastWinDate,
      largestWin: Number(jackpot.largestWin)
    });
  })
);

module.exports = router;
