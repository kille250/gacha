/**
 * Tournament Routes
 *
 * Handles weekly tournament, leaderboards, checkpoints, burning hours, and cosmetics.
 */

const express = require('express');
const router = express.Router();
const { User } = require('../../../models');
const essenceTapService = require('../../../services/essenceTapService');
const { createRoute, createGetRoute } = require('../createRoute');

// ===========================================
// TOURNAMENT INFO & LEADERBOARDS
// ===========================================

/**
 * GET /tournament/weekly
 * Get weekly tournament info for current user
 */
router.get('/weekly', createGetRoute((state) => {
  return essenceTapService.getWeeklyTournamentInfo(state);
}));

/**
 * GET /tournament/bracket-leaderboard
 * Get bracket-specific leaderboard
 */
router.get('/bracket-leaderboard', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || essenceTapService.getInitialState();
    const userBracket = state.tournament?.bracket || 'C';
    const currentWeek = essenceTapService.getCurrentISOWeek();

    // Get all users with essence tap data
    const users = await User.findAll({
      attributes: ['id', 'username', 'essenceTap'],
      where: {
        essenceTap: {
          [require('sequelize').Op.ne]: null
        }
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
      .slice(0, essenceTapService.tournamentService.BRACKET_SYSTEM.maxPlayersPerBracket)
      .map((entry, index) => ({
        ...entry,
        bracketRank: index + 1
      }));

    // Find user's rank in bracket
    const userRank = bracketPlayers.findIndex(p => p.id === req.user.id) + 1;

    res.json({
      success: true,
      bracket: userBracket,
      bracketInfo: essenceTapService.tournamentService.BRACKET_SYSTEM.brackets[userBracket],
      leaderboard: bracketPlayers,
      userRank: userRank > 0 ? userRank : null,
      weekId: currentWeek
    });
  } catch (error) {
    console.error('Error getting bracket leaderboard:', error);
    res.status(500).json({ error: 'Failed to get bracket leaderboard' });
  }
});

/**
 * GET /tournament/burning-hour
 * Get current burning hour status
 */
router.get('/burning-hour', async (req, res) => {
  try {
    const status = essenceTapService.getBurningHourStatus();

    res.json({
      success: true,
      ...status,
      config: {
        duration: essenceTapService.tournamentService.BURNING_HOURS.duration,
        multiplier: essenceTapService.tournamentService.BURNING_HOURS.multiplier
      }
    });
  } catch (error) {
    console.error('Error getting burning hour status:', error);
    res.status(500).json({ error: 'Failed to get burning hour status' });
  }
});

// ===========================================
// REWARD CLAIMING
// ===========================================

/**
 * POST /tournament/weekly/claim
 * Claim weekly tournament rewards
 */
router.post('/weekly/claim', createRoute({
  execute: async (ctx) => {
    const result = essenceTapService.claimWeeklyRewards(ctx.state);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Apply FP with cap enforcement (tournament counts toward weekly cap)
    let actualFP = 0;
    let fpCapped = false;
    if (result.rewards.fatePoints > 0) {
      const fpResult = essenceTapService.applyFPWithCap(
        result.newState,
        result.rewards.fatePoints,
        'tournament'
      );
      result.newState = fpResult.newState;
      actualFP = fpResult.actualFP;
      fpCapped = fpResult.capped;
    }

    return {
      success: true,
      newState: result.newState,
      fatePointsToAward: actualFP,
      rollTicketsToAward: result.rewards.rollTickets,
      data: {
        tier: result.tier,
        rewards: {
          ...result.rewards,
          fatePoints: actualFP,
          fatePointsCapped: fpCapped
        },
        // v4.0 additions
        breakdown: result.breakdown,
        bracketRank: result.bracketRank,
        streak: result.streak
      }
    };
  }
}));

/**
 * POST /tournament/checkpoint/claim
 * Claim a daily checkpoint reward
 */
router.post('/checkpoint/claim', createRoute({
  validate: (body) => {
    if (!body.day || body.day < 1 || body.day > 7) {
      return 'Invalid checkpoint day (1-7)';
    }
    return null;
  },
  execute: async (ctx) => {
    const result = essenceTapService.claimTournamentCheckpoint(ctx.state, ctx.body.day);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Apply FP with cap
    let actualFP = 0;
    let fpCapped = false;
    if (result.rewards.fatePoints > 0) {
      const fpResult = essenceTapService.applyFPWithCap(
        result.newState,
        result.rewards.fatePoints,
        'checkpoint'
      );
      result.newState = fpResult.newState;
      actualFP = fpResult.actualFP;
      fpCapped = fpResult.capped;
    }

    return {
      success: true,
      newState: result.newState,
      fatePointsToAward: actualFP,
      rollTicketsToAward: result.rewards.rollTickets,
      data: {
        day: result.day,
        checkpointName: result.checkpointName,
        rewards: {
          ...result.rewards,
          fatePoints: actualFP,
          fatePointsCapped: fpCapped
        }
      }
    };
  }
}));

// ===========================================
// COSMETICS
// ===========================================

/**
 * GET /tournament/cosmetics
 * Get user's tournament cosmetics
 */
router.get('/cosmetics', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = user.essenceTap || essenceTapService.getInitialState();
    const cosmetics = state.tournament?.cosmetics || { owned: [], equipped: {} };

    // Get full cosmetic details
    const ownedDetails = cosmetics.owned.map(id =>
      essenceTapService.tournamentService.TOURNAMENT_COSMETICS.items[id]
    ).filter(Boolean);

    const equippedDetails = {};
    for (const [slot, id] of Object.entries(cosmetics.equipped)) {
      if (id) {
        equippedDetails[slot] = essenceTapService.tournamentService.TOURNAMENT_COSMETICS.items[id];
      }
    }

    res.json({
      success: true,
      owned: ownedDetails,
      equipped: equippedDetails,
      equippedIds: cosmetics.equipped,
      allCosmetics: essenceTapService.tournamentService.TOURNAMENT_COSMETICS.items
    });
  } catch (error) {
    console.error('Error getting cosmetics:', error);
    res.status(500).json({ error: 'Failed to get cosmetics' });
  }
});

/**
 * POST /tournament/cosmetics/equip
 * Equip a tournament cosmetic
 */
router.post('/cosmetics/equip', createRoute({
  validate: (body) => {
    if (!body.cosmeticId) {
      return 'Cosmetic ID required';
    }
    return null;
  },
  lockUser: false,
  execute: async (ctx) => {
    const result = essenceTapService.equipTournamentCosmetic(ctx.state, ctx.body.cosmeticId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        equippedSlot: result.equippedSlot,
        equipped: result.newState.tournament.cosmetics.equipped
      }
    };
  }
}));

/**
 * POST /tournament/cosmetics/unequip
 * Unequip a tournament cosmetic from a slot
 */
router.post('/cosmetics/unequip', createRoute({
  validate: (body) => {
    if (!body.slot || !['avatarFrame', 'profileTitle', 'tapSkin'].includes(body.slot)) {
      return 'Valid slot required (avatarFrame, profileTitle, tapSkin)';
    }
    return null;
  },
  lockUser: false,
  execute: async (ctx) => {
    const result = essenceTapService.unequipTournamentCosmetic(ctx.state, ctx.body.slot);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        equipped: result.newState.tournament.cosmetics.equipped
      }
    };
  }
}));

module.exports = router;
