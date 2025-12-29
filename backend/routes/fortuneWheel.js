/**
 * Fortune Wheel Routes
 *
 * API endpoints for the daily fortune wheel mini-game.
 * Players can spin once daily (plus bonus spins from streaks) for variable rewards.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { enforcementMiddleware } = require('../middleware/enforcement');
const { User } = require('../models');
const {
  getFullStatus,
  performSpin,
  getSpinHistory,
  getActiveMultiplier
} = require('../services/fortuneWheelService');
const { sensitiveActionLimiter } = require('../middleware/rateLimiter');

/**
 * GET /api/fortune-wheel/status
 * Get current wheel status including available spins, wheel config, and history
 */
router.get('/status', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const status = getFullStatus(user);

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Fortune wheel status error:', error);
    res.status(500).json({ error: 'Failed to get wheel status' });
  }
});

/**
 * POST /api/fortune-wheel/spin
 * Perform a wheel spin and receive rewards
 * Rate limited to prevent abuse
 */
router.post('/spin', [auth, enforcementMiddleware, sensitiveActionLimiter], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await performSpin(user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        nextSpinAt: result.nextSpinAt
      });
    }

    res.json({
      success: true,
      segment: result.segment,
      rewards: result.rewards,
      pityTriggered: result.pityTriggered,
      animation: result.animation,
      newState: result.newState,
      user: {
        points: user.points,
        rollTickets: user.rollTickets,
        premiumTickets: user.premiumTickets
      }
    });
  } catch (error) {
    console.error('Fortune wheel spin error:', error);
    res.status(500).json({ error: 'Failed to spin wheel' });
  }
});

/**
 * GET /api/fortune-wheel/history
 * Get spin history for the user
 */
router.get('/history', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const history = getSpinHistory(user, limit);

    res.json({
      success: true,
      history,
      totalSpins: user.fortuneWheel?.totalSpins || 0
    });
  } catch (error) {
    console.error('Fortune wheel history error:', error);
    res.status(500).json({ error: 'Failed to get spin history' });
  }
});

/**
 * GET /api/fortune-wheel/multiplier
 * Check for active XP multiplier from wheel rewards
 */
router.get('/multiplier', [auth], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const multiplier = getActiveMultiplier(user);

    res.json({
      success: true,
      hasMultiplier: !!multiplier,
      multiplier
    });
  } catch (error) {
    console.error('Fortune wheel multiplier error:', error);
    res.status(500).json({ error: 'Failed to get multiplier status' });
  }
});

module.exports = router;
