/**
 * Tournament Handlers - Weekly tournament operations
 */

const { createHandler } = require('../createHandler');
const essenceTapService = require('../../../services/essenceTapService');

/**
 * Handle claiming tournament rewards
 */
const handleClaimTournamentRewards = createHandler({
  eventName: 'tournament_rewards_claimed',
  errorCode: 'TOURNAMENT_ERROR',
  execute: async (ctx) => {
    const { WEEKLY_TOURNAMENT } = require('../../../config/essenceTap');

    // Check if rewards are available
    const tournamentInfo = essenceTapService.getWeeklyTournamentInfo(ctx.state);
    if (!tournamentInfo.canClaimRewards) {
      return {
        success: false,
        error: 'No tournament rewards available to claim',
        code: 'NO_REWARDS'
      };
    }

    // Get rewards for the tier
    const tierRewards = WEEKLY_TOURNAMENT.tiers[tournamentInfo.tier];
    if (!tierRewards) {
      return {
        success: false,
        error: 'Invalid tier',
        code: 'INVALID_TIER'
      };
    }

    // Mark rewards as claimed
    const newState = { ...ctx.state };
    newState.weekly = { ...ctx.state.weekly, rewardsClaimed: true };

    // Apply FP with cap
    const fpResult = essenceTapService.applyFPWithCap(
      newState,
      tierRewards.fatePoints,
      'tournament'
    );

    return {
      success: true,
      newState: fpResult.newState,
      fatePointsToAward: fpResult.actualFP,
      rollTicketsToAward: tierRewards.rollTickets,
      data: {
        tier: tournamentInfo.tier,
        rewards: {
          fatePoints: fpResult.actualFP,
          rollTickets: tierRewards.rollTickets,
          capped: fpResult.capped
        },
        weeklyTournament: essenceTapService.getWeeklyTournamentInfo(fpResult.newState)
      }
    };
  }
});

/**
 * Handle claiming tournament checkpoint
 */
const handleClaimTournamentCheckpoint = createHandler({
  eventName: 'tournament_checkpoint_claimed',
  errorCode: 'CHECKPOINT_ERROR',
  validate: (data) => data.day !== undefined ? null : 'Checkpoint day required',
  execute: async (ctx, data) => {
    const { day } = data;
    const { WEEKLY_TOURNAMENT } = require('../../../config/essenceTap');

    const checkpoint = WEEKLY_TOURNAMENT.checkpoints?.find(cp => cp.day === day);
    if (!checkpoint) {
      return {
        success: false,
        error: 'Invalid checkpoint',
        code: 'INVALID_CHECKPOINT'
      };
    }

    const claimedCheckpoints = ctx.state.weekly?.claimedCheckpoints || [];
    if (claimedCheckpoints.includes(day)) {
      return {
        success: false,
        error: 'Checkpoint already claimed',
        code: 'ALREADY_CLAIMED'
      };
    }

    const weeklyEssence = ctx.state.weekly?.essenceEarned || 0;
    if (weeklyEssence < checkpoint.essenceRequired) {
      return {
        success: false,
        error: 'Checkpoint requirements not met',
        code: 'REQUIREMENTS_NOT_MET'
      };
    }

    const newState = { ...ctx.state };
    newState.weekly = {
      ...ctx.state.weekly,
      claimedCheckpoints: [...claimedCheckpoints, day]
    };

    // Apply FP with cap
    const fpResult = essenceTapService.applyFPWithCap(
      newState,
      checkpoint.rewards.fatePoints || 0,
      'checkpoint'
    );

    return {
      success: true,
      newState: fpResult.newState,
      fatePointsToAward: fpResult.actualFP,
      rollTicketsToAward: checkpoint.rewards.rollTickets || 0,
      data: {
        day,
        checkpointName: checkpoint.name,
        rewards: {
          fatePoints: fpResult.actualFP,
          rollTickets: checkpoint.rewards.rollTickets || 0,
          capped: fpResult.capped
        },
        claimedCheckpoints: newState.weekly.claimedCheckpoints
      }
    };
  }
});

/**
 * Handle claiming daily streak for tickets
 */
const handleClaimDailyStreak = createHandler({
  eventName: 'daily_streak_claimed',
  errorCode: 'STREAK_ERROR',
  resetDaily: true,
  execute: async (ctx) => {
    const { TICKET_GENERATION } = require('../../../config/essenceTap');

    const today = new Date().toISOString().split('T')[0];
    const lastStreakDate = ctx.state.ticketGeneration?.lastStreakDate;

    if (lastStreakDate === today) {
      return {
        success: false,
        error: 'Already claimed streak today',
        code: 'ALREADY_CLAIMED'
      };
    }

    const newState = { ...ctx.state };
    newState.ticketGeneration = { ...ctx.state.ticketGeneration };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastStreakDate === yesterdayStr) {
      newState.ticketGeneration.dailyStreakDays = (ctx.state.ticketGeneration?.dailyStreakDays || 0) + 1;
    } else {
      newState.ticketGeneration.dailyStreakDays = 1;
    }

    newState.ticketGeneration.lastStreakDate = today;

    const streakDays = newState.ticketGeneration.dailyStreakDays;
    let ticketsAwarded = 0;

    for (const milestone of TICKET_GENERATION.streakMilestones || []) {
      if (streakDays === milestone.days) {
        ticketsAwarded = milestone.tickets;
        break;
      }
    }

    return {
      success: true,
      newState,
      rollTicketsToAward: ticketsAwarded,
      data: {
        streakDays,
        ticketsAwarded,
        awarded: ticketsAwarded > 0,
        ticketGeneration: newState.ticketGeneration
      }
    };
  }
});

module.exports = {
  handleClaimTournamentRewards,
  handleClaimTournamentCheckpoint,
  handleClaimDailyStreak
};
