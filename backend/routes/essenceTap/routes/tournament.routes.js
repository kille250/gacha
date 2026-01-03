/**
 * Tournament Routes
 *
 * Handles weekly tournament, leaderboards, checkpoints, burning hours, and cosmetics.
 * Uses unified action handlers and middleware.
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User } = require('../../../models');
const { actions, getCurrentISOWeek } = require('../../../services/essenceTap');
const {
  loadGameState,
  saveGameState,
  asyncHandler,
  awardFP,
  awardTickets
} = require('../middleware');
const config = require('../../../config/essenceTap');

// ===========================================
// TOURNAMENT INFO & LEADERBOARDS
// ===========================================

/**
 * GET /tournament/weekly
 * Get weekly tournament info for current user
 */
router.get('/weekly',
  loadGameState,
  asyncHandler(async (req, res) => {
    const tournamentInfo = actions.getWeeklyTournamentInfo(req.gameState);
    return res.json(tournamentInfo);
  })
);

/**
 * GET /tournament/bracket-leaderboard
 * Get bracket-specific leaderboard
 */
router.get('/bracket-leaderboard',
  loadGameState,
  asyncHandler(async (req, res) => {
    const state = req.gameState;
    const userBracket = state.tournament?.bracket || 'C';
    const currentWeek = getCurrentISOWeek();

    // Get all users with essence tap data
    const users = await User.findAll({
      attributes: ['id', 'username', 'essenceTap'],
      where: {
        essenceTap: { [Op.ne]: null }
      }
    });

    // Filter to users in the same bracket
    const bracketPlayers = users
      .filter(u => {
        const uState = u.essenceTap;
        const uBracket = uState?.tournament?.bracket || 'C';
        return uBracket === userBracket;
      })
      .map(u => {
        const uState = u.essenceTap;
        const weeklyEssence = uState?.weekly?.weekId === currentWeek
          ? (uState?.weekly?.essenceEarned || 0)
          : 0;
        return {
          id: u.id,
          username: u.username,
          weeklyEssence,
          bracket: uState?.tournament?.bracket || 'C'
        };
      })
      .sort((a, b) => b.weeklyEssence - a.weeklyEssence)
      .slice(0, config.BRACKET_SYSTEM?.maxPlayersPerBracket || 100)
      .map((entry, index) => ({
        ...entry,
        bracketRank: index + 1
      }));

    // Find user's rank in bracket
    const userRank = bracketPlayers.findIndex(p => p.id === req.user.id) + 1;

    res.json({
      success: true,
      bracket: userBracket,
      bracketInfo: config.BRACKET_SYSTEM?.brackets?.[userBracket],
      leaderboard: bracketPlayers,
      userRank: userRank > 0 ? userRank : null,
      weekId: currentWeek
    });
  })
);

/**
 * GET /tournament/burning-hour
 * Get current burning hour status
 */
router.get('/burning-hour',
  asyncHandler(async (req, res) => {
    const status = actions.getBurningHourStatus();

    res.json({
      success: true,
      ...status,
      config: {
        duration: config.BURNING_HOURS?.duration || 3600000,
        multiplier: config.BURNING_HOURS?.multiplier || 2
      }
    });
  })
);

// ===========================================
// REWARD CLAIMING
// ===========================================

/**
 * POST /tournament/weekly/claim
 * Claim weekly tournament rewards
 */
router.post('/weekly/claim',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    const result = actions.claimWeeklyRewards({ state: req.gameState });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    let newState = result.newState;
    let actualFP = 0;
    let fpCapped = false;

    // Apply FP with cap enforcement
    if (result.rewards?.fatePoints > 0) {
      const fpResult = awardFP({
        user: req.gameUser,
        state: newState,
        amount: result.rewards.fatePoints,
        source: 'tournament'
      });
      newState = fpResult.newState;
      actualFP = fpResult.actualFP;
      fpCapped = fpResult.capped;
      req.gameUser.fatePoints = fpResult.fatePoints;
    }

    // Apply tickets
    if (result.rewards?.rollTickets > 0) {
      awardTickets({
        user: req.gameUser,
        amount: result.rewards.rollTickets
      });
    }

    // Update state for saving
    req.gameState = newState;
    req.gameStateChanged = true;

    // Set response
    res.locals.response = {
      success: true,
      tier: result.tier,
      rewards: {
        ...result.rewards,
        fatePoints: actualFP,
        fatePointsCapped: fpCapped
      },
      breakdown: result.breakdown,
      bracketRank: result.bracketRank,
      streak: result.streak
    };

    next();
  }),
  saveGameState
);

/**
 * POST /tournament/checkpoint/claim
 * Claim a daily checkpoint reward
 */
router.post('/checkpoint/claim',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    const { day } = req.body;

    if (!day || day < 1 || day > 7) {
      return res.status(400).json({ error: 'Invalid checkpoint day (1-7)' });
    }

    const result = actions.claimTournamentCheckpoint({
      state: req.gameState,
      day: parseInt(day, 10)
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    let newState = result.newState;
    let actualFP = 0;
    let fpCapped = false;

    // Apply FP with cap
    if (result.rewards?.fatePoints > 0) {
      const fpResult = awardFP({
        user: req.gameUser,
        state: newState,
        amount: result.rewards.fatePoints,
        source: 'checkpoint'
      });
      newState = fpResult.newState;
      actualFP = fpResult.actualFP;
      fpCapped = fpResult.capped;
      req.gameUser.fatePoints = fpResult.fatePoints;
    }

    // Apply tickets
    if (result.rewards?.rollTickets > 0) {
      awardTickets({
        user: req.gameUser,
        amount: result.rewards.rollTickets
      });
    }

    // Update state for saving
    req.gameState = newState;
    req.gameStateChanged = true;

    // Set response
    res.locals.response = {
      success: true,
      day: result.day,
      checkpointName: result.checkpointName,
      rewards: {
        ...result.rewards,
        fatePoints: actualFP,
        fatePointsCapped: fpCapped
      }
    };

    next();
  }),
  saveGameState
);

// ===========================================
// COSMETICS
// ===========================================

/**
 * GET /tournament/cosmetics
 * Get user's tournament cosmetics
 */
router.get('/cosmetics',
  loadGameState,
  asyncHandler(async (req, res) => {
    const state = req.gameState;
    const cosmetics = state.tournament?.cosmetics || { owned: [], equipped: {} };

    // Get full cosmetic details
    const cosmeticItems = config.TOURNAMENT_COSMETICS?.items || {};
    const ownedDetails = cosmetics.owned
      .map(id => cosmeticItems[id])
      .filter(Boolean);

    const equippedDetails = {};
    for (const [slot, id] of Object.entries(cosmetics.equipped)) {
      if (id && cosmeticItems[id]) {
        equippedDetails[slot] = cosmeticItems[id];
      }
    }

    res.json({
      success: true,
      owned: ownedDetails,
      equipped: equippedDetails,
      equippedIds: cosmetics.equipped,
      allCosmetics: cosmeticItems
    });
  })
);

/**
 * POST /tournament/cosmetics/equip
 * Equip a tournament cosmetic
 */
router.post('/cosmetics/equip',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    const { cosmeticId } = req.body;

    if (!cosmeticId) {
      return res.status(400).json({ error: 'Cosmetic ID required' });
    }

    const result = actions.equipCosmetic({
      state: req.gameState,
      cosmeticId
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
      equippedSlot: result.equippedSlot,
      equipped: result.newState.tournament.cosmetics.equipped
    };

    next();
  }),
  saveGameState
);

/**
 * POST /tournament/cosmetics/unequip
 * Unequip a tournament cosmetic from a slot
 */
router.post('/cosmetics/unequip',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    const { slot } = req.body;

    if (!slot || !['avatarFrame', 'profileTitle', 'tapSkin'].includes(slot)) {
      return res.status(400).json({ error: 'Valid slot required (avatarFrame, profileTitle, tapSkin)' });
    }

    const result = actions.unequipCosmetic({
      state: req.gameState,
      slot
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
      equipped: result.newState.tournament.cosmetics.equipped
    };

    next();
  }),
  saveGameState
);

module.exports = router;
