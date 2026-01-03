/**
 * Boss Routes
 *
 * Handles boss encounter operations: spawning, attacking, status, and rewards.
 * Uses unified action handlers and middleware.
 */

const express = require('express');
const router = express.Router();

const { actions } = require('../../../services/essenceTap');
const {
  loadGameState,
  applyPassiveGains,
  saveGameState,
  asyncHandler,
  awardRewards
} = require('../middleware');

// ===========================================
// BOSS ENCOUNTERS
// ===========================================

/**
 * POST /boss/spawn
 * Spawn a boss encounter
 */
router.post('/spawn',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    const result = actions.spawnBoss({ state: req.gameState });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code,
        cooldownRemaining: result.cooldownRemaining,
        clicksUntilSpawn: result.clicksUntilSpawn
      });
    }

    // Update state for saving
    req.gameState = result.newState;
    req.gameStateChanged = true;

    // Set response
    res.locals.response = {
      success: true,
      boss: result.boss,
      bossEncounter: result.newState.bossEncounter
    };

    next();
  }),
  saveGameState
);

/**
 * POST /boss/attack
 * Attack the current boss
 */
router.post('/attack',
  loadGameState,
  applyPassiveGains,
  asyncHandler(async (req, res, next) => {
    const { damage } = req.body;

    if (damage === undefined || damage < 0) {
      return res.status(400).json({ error: 'Valid damage value required' });
    }

    const result = actions.attackBoss({
      state: req.gameState,
      damage: parseInt(damage, 10),
      characters: req.characters || []
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    let newState = result.newState;

    // Award rewards if boss defeated
    if (result.defeated && result.reward) {
      const rewardResult = awardRewards({
        user: req.gameUser,
        state: newState,
        rewards: result.reward,
        source: 'boss_defeat'
      });
      newState = rewardResult.newState;
    }

    // Update state for saving
    req.gameState = newState;
    req.gameStateChanged = true;

    // Set response
    const responseData = {
      success: true,
      damage: result.damage,
      currentHealth: result.currentHealth,
      defeated: result.defeated,
      bossEncounter: newState.bossEncounter
    };

    if (result.defeated && result.reward) {
      responseData.reward = result.reward;
      responseData.essence = newState.essence;
    }

    res.locals.response = responseData;
    next();
  }),
  saveGameState
);

/**
 * GET /boss/status
 * Get current boss encounter status
 */
router.get('/status',
  loadGameState,
  asyncHandler(async (req, res) => {
    const bossInfo = actions.getBossInfo(req.gameState);
    return res.json(bossInfo);
  })
);

/**
 * POST /boss/rewards/claim
 * Claim boss reward (if not auto-claimed)
 */
router.post('/rewards/claim',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    const result = actions.claimBossReward
      ? actions.claimBossReward({ state: req.gameState })
      : { success: false, error: 'Rewards auto-claimed on defeat' };

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    let newState = result.newState;

    // Award rewards
    if (result.reward) {
      const rewardResult = awardRewards({
        user: req.gameUser,
        state: newState,
        rewards: result.reward,
        source: 'boss_claim'
      });
      newState = rewardResult.newState;
    }

    // Update state for saving
    req.gameState = newState;
    req.gameStateChanged = true;

    // Set response
    res.locals.response = {
      success: true,
      reward: result.reward,
      essence: newState.essence,
      bossEncounter: newState.bossEncounter
    };

    next();
  }),
  saveGameState
);

module.exports = router;
