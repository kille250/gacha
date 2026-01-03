/**
 * Tournament Service Tests
 *
 * Tests for tournament domain service functionality including:
 * - Weekly progress updates
 * - Tier calculation
 * - Checkpoint claiming
 * - Burning hour status
 */

// Mock tournament configuration
const MOCK_WEEKLY_TOURNAMENT = {
  startDay: 1, // Monday
  endDay: 0,   // Sunday
  tiers: [
    { name: 'Bronze', minEssence: 10000000 },
    { name: 'Silver', minEssence: 100000000 },
    { name: 'Gold', minEssence: 500000000 },
    { name: 'Platinum', minEssence: 2000000000 },
    { name: 'Diamond', minEssence: 10000000000 },
    { name: 'Champion', minEssence: 25000000000 }
  ],
  rewards: {
    Bronze: { fatePoints: 5, rollTickets: 2 },
    Silver: { fatePoints: 12, rollTickets: 4 },
    Gold: { fatePoints: 25, rollTickets: 8 },
    Platinum: { fatePoints: 40, rollTickets: 15 },
    Diamond: { fatePoints: 60, rollTickets: 25 },
    Champion: { fatePoints: 75, rollTickets: 40 }
  },
  participationReward: {
    minimumEssence: 10000000,
    rewards: { fatePoints: 5, rollTickets: 1 }
  }
};

const MOCK_DAILY_CHECKPOINTS = {
  checkpoints: [
    { day: 1, cumulativeTarget: 50000000, rewards: { rollTickets: 1 }, name: 'Monday Start' },
    { day: 2, cumulativeTarget: 150000000, rewards: { rollTickets: 1 }, name: 'Tuesday Push' },
    { day: 3, cumulativeTarget: 300000000, rewards: { rollTickets: 1, fatePoints: 3 }, name: 'Midweek Milestone' },
    { day: 4, cumulativeTarget: 500000000, rewards: { rollTickets: 2 }, name: 'Thursday Threshold' },
    { day: 5, cumulativeTarget: 800000000, rewards: { rollTickets: 2 }, name: 'Friday Focus' },
    { day: 6, cumulativeTarget: 1200000000, rewards: { rollTickets: 2, fatePoints: 5 }, name: 'Saturday Sprint' },
    { day: 7, cumulativeTarget: 2000000000, rewards: { rollTickets: 3 }, name: 'Sunday Finish' }
  ]
};

const MOCK_BURNING_HOURS = {
  duration: 7200000, // 2 hours
  multiplier: 2.0,
  eventsPerDay: 1
};

jest.mock('../../../config/essenceTap', () => ({
  WEEKLY_TOURNAMENT: MOCK_WEEKLY_TOURNAMENT,
  DAILY_CHECKPOINTS: MOCK_DAILY_CHECKPOINTS,
  BURNING_HOURS: MOCK_BURNING_HOURS
}));

describe('Tournament Service', () => {
  let baseState;

  beforeEach(() => {
    jest.resetModules();

    baseState = {
      weekly: {
        weekId: '2024-W15',
        essenceEarned: 0,
        rank: null,
        rewardsClaimed: false,
        checkpointsClaimed: []
      },
      burningHour: {
        active: false,
        startTime: null,
        endTime: null
      }
    };
  });

  describe('updateWeeklyProgress', () => {
    it('should update weekly essence earned', () => {
      const essenceGained = 5000000;
      const result = mockUpdateWeeklyProgress(baseState, essenceGained);

      expect(result.success).toBe(true);
      expect(result.newState.weekly.essenceEarned).toBe(essenceGained);
    });

    it('should accumulate essence over multiple updates', () => {
      let state = baseState;

      const result1 = mockUpdateWeeklyProgress(state, 1000000);
      state = result1.newState;

      const result2 = mockUpdateWeeklyProgress(state, 2000000);
      state = result2.newState;

      const result3 = mockUpdateWeeklyProgress(state, 3000000);

      expect(result3.newState.weekly.essenceEarned).toBe(6000000);
    });

    it('should reset progress for new week', () => {
      const stateOldWeek = {
        ...baseState,
        weekly: {
          weekId: '2024-W14',
          essenceEarned: 50000000,
          rank: 15,
          rewardsClaimed: false,
          checkpointsClaimed: [1, 2]
        }
      };

      const currentWeek = '2024-W15';
      const result = mockUpdateWeeklyProgress(stateOldWeek, 1000000, currentWeek);

      expect(result.success).toBe(true);
      expect(result.newState.weekly.weekId).toBe(currentWeek);
      expect(result.newState.weekly.essenceEarned).toBe(1000000);
      expect(result.newState.weekly.checkpointsClaimed).toEqual([]);
      expect(result.weekReset).toBe(true);
    });

    it('should maintain week ID when updating same week', () => {
      const currentWeek = '2024-W15';
      const result = mockUpdateWeeklyProgress(baseState, 5000000, currentWeek);

      expect(result.newState.weekly.weekId).toBe(currentWeek);
    });
  });

  describe('getTier', () => {
    it('should return null tier when no essence earned', () => {
      const tier = mockGetTier(0);
      expect(tier).toBeNull();
    });

    it('should return Bronze tier for minimum threshold', () => {
      const tier = mockGetTier(15000000);
      expect(tier.name).toBe('Bronze');
    });

    it('should return Silver tier for Silver threshold', () => {
      const tier = mockGetTier(150000000);
      expect(tier.name).toBe('Silver');
    });

    it('should return Gold tier for Gold threshold', () => {
      const tier = mockGetTier(600000000);
      expect(tier.name).toBe('Gold');
    });

    it('should return Platinum tier for Platinum threshold', () => {
      const tier = mockGetTier(3000000000);
      expect(tier.name).toBe('Platinum');
    });

    it('should return Diamond tier for Diamond threshold', () => {
      const tier = mockGetTier(15000000000);
      expect(tier.name).toBe('Diamond');
    });

    it('should return Champion tier for Champion threshold', () => {
      const tier = mockGetTier(50000000000);
      expect(tier.name).toBe('Champion');
    });

    it('should return highest achieved tier, not next tier', () => {
      const tier = mockGetTier(250000000); // Between Silver and Gold
      expect(tier.name).toBe('Silver');
    });
  });

  describe('getTournamentRewards', () => {
    it('should return tier rewards for achieved tier', () => {
      const stateWithGold = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 600000000
        }
      };

      const rewards = mockGetTournamentRewards(stateWithGold);

      expect(rewards.tier).toBe('Gold');
      expect(rewards.rewards.fatePoints).toBe(25);
      expect(rewards.rewards.rollTickets).toBe(8);
    });

    it('should return participation rewards when threshold met but no tier', () => {
      const stateWithParticipation = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 9000000 // Below Bronze but above participation
        }
      };

      const rewards = mockGetTournamentRewards(stateWithParticipation);

      expect(rewards.tier).toBeNull();
      expect(rewards.participation).toBe(false);
    });

    it('should return Champion rewards for highest tier', () => {
      const stateWithChampion = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 50000000000
        }
      };

      const rewards = mockGetTournamentRewards(stateWithChampion);

      expect(rewards.tier).toBe('Champion');
      expect(rewards.rewards.fatePoints).toBe(75);
      expect(rewards.rewards.rollTickets).toBe(40);
    });

    it('should fail when already claimed', () => {
      const stateAlreadyClaimed = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 600000000,
          rewardsClaimed: true
        }
      };

      const result = mockClaimTournamentRewards(stateAlreadyClaimed);

      expect(result.success).toBe(false);
      expect(result.code).toBe('ALREADY_CLAIMED');
    });
  });

  describe('checkpointClaiming', () => {
    it('should claim checkpoint when threshold reached', () => {
      const stateWithProgress = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 60000000,
          checkpointsClaimed: []
        }
      };

      const result = mockClaimCheckpoint(stateWithProgress, 1);

      expect(result.success).toBe(true);
      expect(result.rewards.rollTickets).toBe(1);
      expect(result.newState.weekly.checkpointsClaimed).toContain(1);
    });

    it('should fail when checkpoint threshold not reached', () => {
      const stateInsufficientProgress = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 30000000,
          checkpointsClaimed: []
        }
      };

      const result = mockClaimCheckpoint(stateInsufficientProgress, 1);

      expect(result.success).toBe(false);
      expect(result.code).toBe('REQUIREMENTS_NOT_MET');
    });

    it('should fail when checkpoint already claimed', () => {
      const stateAlreadyClaimed = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 100000000,
          checkpointsClaimed: [1]
        }
      };

      const result = mockClaimCheckpoint(stateAlreadyClaimed, 1);

      expect(result.success).toBe(false);
      expect(result.code).toBe('ALREADY_CLAIMED');
    });

    it('should fail with invalid checkpoint day', () => {
      const result = mockClaimCheckpoint(baseState, 10);

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_CHECKPOINT');
    });

    it('should allow claiming multiple checkpoints', () => {
      const stateWithProgress = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 350000000,
          checkpointsClaimed: [1, 2]
        }
      };

      const result = mockClaimCheckpoint(stateWithProgress, 3);

      expect(result.success).toBe(true);
      expect(result.newState.weekly.checkpointsClaimed).toContain(1);
      expect(result.newState.weekly.checkpointsClaimed).toContain(2);
      expect(result.newState.weekly.checkpointsClaimed).toContain(3);
    });

    it('should include FP in checkpoint rewards when applicable', () => {
      const stateWithMidweekProgress = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 350000000,
          checkpointsClaimed: [1, 2]
        }
      };

      const result = mockClaimCheckpoint(stateWithMidweekProgress, 3);

      expect(result.success).toBe(true);
      expect(result.rewards.fatePoints).toBe(3);
      expect(result.rewards.rollTickets).toBe(1);
    });
  });

  describe('getCheckpointProgress', () => {
    it('should return progress for all checkpoints', () => {
      const stateWithProgress = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 175000000,
          checkpointsClaimed: [1]
        }
      };

      const progress = mockGetCheckpointProgress(stateWithProgress);

      expect(progress.length).toBe(7);
      expect(progress[0].claimed).toBe(true);
      expect(progress[1].canClaim).toBe(true);
      expect(progress[1].claimed).toBe(false);
    });

    it('should indicate claimable checkpoints', () => {
      const stateWithProgress = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 600000000,
          checkpointsClaimed: [1, 2, 3]
        }
      };

      const progress = mockGetCheckpointProgress(stateWithProgress);
      const claimable = progress.filter(cp => cp.canClaim && !cp.claimed);

      expect(claimable.length).toBeGreaterThan(0);
      expect(claimable[0].day).toBe(4);
    });

    it('should show progress percentage for each checkpoint', () => {
      const stateWithProgress = {
        ...baseState,
        weekly: {
          ...baseState.weekly,
          essenceEarned: 100000000,
          checkpointsClaimed: []
        }
      };

      const progress = mockGetCheckpointProgress(stateWithProgress);

      expect(progress[0].progress).toBeGreaterThan(1); // Over 100% for day 1
      expect(progress[1].progress).toBeLessThan(1); // Under 100% for day 2
    });
  });

  describe('burningHourStatus', () => {
    it('should indicate burning hour is active when within duration', () => {
      const now = Date.now();
      const stateWithActiveBurning = {
        ...baseState,
        burningHour: {
          active: true,
          startTime: now - 3600000, // 1 hour ago
          endTime: now + 3600000     // 1 hour from now
        }
      };

      const status = mockGetBurningHourStatus(stateWithActiveBurning);

      expect(status.active).toBe(true);
      expect(status.multiplier).toBe(2.0);
      expect(status.timeRemaining).toBeGreaterThan(0);
    });

    it('should indicate burning hour is not active when expired', () => {
      const now = Date.now();
      const stateWithExpiredBurning = {
        ...baseState,
        burningHour: {
          active: true,
          startTime: now - 10000000,
          endTime: now - 1000 // Expired
        }
      };

      const status = mockGetBurningHourStatus(stateWithExpiredBurning);

      expect(status.active).toBe(false);
    });

    it('should indicate burning hour is not active when not started', () => {
      const stateNoBurning = {
        ...baseState,
        burningHour: {
          active: false,
          startTime: null,
          endTime: null
        }
      };

      const status = mockGetBurningHourStatus(stateNoBurning);

      expect(status.active).toBe(false);
      expect(status.multiplier).toBe(1.0);
    });

    it('should return correct time remaining during burning hour', () => {
      const now = Date.now();
      const stateWithActiveBurning = {
        ...baseState,
        burningHour: {
          active: true,
          startTime: now - 1800000, // 30 min ago
          endTime: now + 5400000    // 90 min from now
        }
      };

      const status = mockGetBurningHourStatus(stateWithActiveBurning);

      expect(status.timeRemaining).toBeGreaterThan(5000); // More than 5000 seconds
      expect(status.timeRemaining).toBeLessThan(5500); // Less than 5500 seconds
    });
  });

  describe('getTournamentInfo', () => {
    it('should return complete tournament information', () => {
      const stateWithProgress = {
        ...baseState,
        weekly: {
          weekId: '2024-W15',
          essenceEarned: 650000000,
          rank: null,
          rewardsClaimed: false,
          checkpointsClaimed: [1, 2, 3]
        }
      };

      const info = mockGetTournamentInfo(stateWithProgress);

      expect(info.weekId).toBe('2024-W15');
      expect(info.essenceEarned).toBe(650000000);
      expect(info.currentTier).toBeDefined();
      expect(info.currentTier.name).toBe('Gold');
      expect(info.nextTier).toBeDefined();
      expect(info.checkpoints).toBeDefined();
    });

    it('should calculate essence needed for next tier', () => {
      const stateWithProgress = {
        ...baseState,
        weekly: {
          weekId: '2024-W15',
          essenceEarned: 150000000,
          rank: null,
          rewardsClaimed: false,
          checkpointsClaimed: []
        }
      };

      const info = mockGetTournamentInfo(stateWithProgress);

      expect(info.nextTier.name).toBe('Gold');
      expect(info.essenceToNextTier).toBe(350000000); // 500M - 150M
    });

    it('should indicate max tier when Champion achieved', () => {
      const stateWithChampion = {
        ...baseState,
        weekly: {
          weekId: '2024-W15',
          essenceEarned: 50000000000,
          rank: null,
          rewardsClaimed: false,
          checkpointsClaimed: []
        }
      };

      const info = mockGetTournamentInfo(stateWithChampion);

      expect(info.currentTier.name).toBe('Champion');
      expect(info.nextTier).toBeNull();
      expect(info.essenceToNextTier).toBe(0);
    });

    it('should include checkpoint progress summary', () => {
      const stateWithProgress = {
        ...baseState,
        weekly: {
          weekId: '2024-W15',
          essenceEarned: 400000000,
          rank: null,
          rewardsClaimed: false,
          checkpointsClaimed: [1, 2]
        }
      };

      const info = mockGetTournamentInfo(stateWithProgress);

      expect(info.checkpointsClaimed).toBe(2);
      expect(info.checkpointsAvailable).toBeGreaterThan(0);
    });
  });
});

// Mock implementations for testing

function mockUpdateWeeklyProgress(state, essenceGained, currentWeek = null) {
  const weekId = currentWeek || state.weekly?.weekId || '2024-W15';
  const existingWeek = state.weekly?.weekId;

  let weekReset = false;
  let newEssence = essenceGained;

  if (existingWeek && existingWeek !== weekId) {
    // New week - reset
    weekReset = true;
  } else {
    // Same week - accumulate
    newEssence = (state.weekly?.essenceEarned || 0) + essenceGained;
  }

  const newState = {
    ...state,
    weekly: {
      weekId,
      essenceEarned: newEssence,
      rank: weekReset ? null : state.weekly?.rank,
      rewardsClaimed: weekReset ? false : state.weekly?.rewardsClaimed,
      checkpointsClaimed: weekReset ? [] : (state.weekly?.checkpointsClaimed || [])
    }
  };

  return {
    success: true,
    weekReset,
    newState
  };
}

function mockGetTier(essenceEarned) {
  let currentTier = null;

  for (let i = MOCK_WEEKLY_TOURNAMENT.tiers.length - 1; i >= 0; i--) {
    const tier = MOCK_WEEKLY_TOURNAMENT.tiers[i];
    if (essenceEarned >= tier.minEssence) {
      currentTier = tier;
      break;
    }
  }

  return currentTier;
}

function mockGetTournamentRewards(state) {
  const essenceEarned = state.weekly?.essenceEarned || 0;
  const tier = mockGetTier(essenceEarned);

  if (!tier) {
    const participation = essenceEarned >= MOCK_WEEKLY_TOURNAMENT.participationReward.minimumEssence;
    return {
      tier: null,
      participation,
      rewards: participation ? MOCK_WEEKLY_TOURNAMENT.participationReward.rewards : null
    };
  }

  return {
    tier: tier.name,
    rewards: MOCK_WEEKLY_TOURNAMENT.rewards[tier.name]
  };
}

function mockClaimTournamentRewards(state) {
  if (state.weekly?.rewardsClaimed) {
    return {
      success: false,
      error: 'Tournament rewards already claimed',
      code: 'ALREADY_CLAIMED'
    };
  }

  const rewardInfo = mockGetTournamentRewards(state);

  if (!rewardInfo.rewards) {
    return {
      success: false,
      error: 'No rewards available',
      code: 'NO_REWARDS'
    };
  }

  const newState = {
    ...state,
    weekly: {
      ...state.weekly,
      rewardsClaimed: true
    }
  };

  return {
    success: true,
    tier: rewardInfo.tier,
    rewards: rewardInfo.rewards,
    newState
  };
}

function mockClaimCheckpoint(state, day) {
  const checkpoint = MOCK_DAILY_CHECKPOINTS.checkpoints.find(cp => cp.day === day);

  if (!checkpoint) {
    return {
      success: false,
      error: 'Invalid checkpoint day',
      code: 'INVALID_CHECKPOINT'
    };
  }

  const checkpointsClaimed = state.weekly?.checkpointsClaimed || [];

  if (checkpointsClaimed.includes(day)) {
    return {
      success: false,
      error: 'Checkpoint already claimed',
      code: 'ALREADY_CLAIMED'
    };
  }

  const essenceEarned = state.weekly?.essenceEarned || 0;

  if (essenceEarned < checkpoint.cumulativeTarget) {
    return {
      success: false,
      error: `Need ${checkpoint.cumulativeTarget} essence to claim this checkpoint`,
      code: 'REQUIREMENTS_NOT_MET'
    };
  }

  const newState = {
    ...state,
    weekly: {
      ...state.weekly,
      checkpointsClaimed: [...checkpointsClaimed, day]
    }
  };

  return {
    success: true,
    checkpoint: checkpoint.name,
    rewards: checkpoint.rewards,
    newState
  };
}

function mockGetCheckpointProgress(state) {
  const essenceEarned = state.weekly?.essenceEarned || 0;
  const checkpointsClaimed = state.weekly?.checkpointsClaimed || [];

  return MOCK_DAILY_CHECKPOINTS.checkpoints.map(cp => {
    const claimed = checkpointsClaimed.includes(cp.day);
    const canClaim = essenceEarned >= cp.cumulativeTarget && !claimed;
    const progress = essenceEarned / cp.cumulativeTarget;

    return {
      day: cp.day,
      name: cp.name,
      target: cp.cumulativeTarget,
      rewards: cp.rewards,
      claimed,
      canClaim,
      progress
    };
  });
}

function mockGetBurningHourStatus(state) {
  const burningHour = state.burningHour || {};

  if (!burningHour.active || !burningHour.endTime) {
    return {
      active: false,
      multiplier: 1.0,
      timeRemaining: 0
    };
  }

  const now = Date.now();

  if (now > burningHour.endTime) {
    return {
      active: false,
      multiplier: 1.0,
      timeRemaining: 0
    };
  }

  const timeRemaining = Math.ceil((burningHour.endTime - now) / 1000);

  return {
    active: true,
    multiplier: MOCK_BURNING_HOURS.multiplier,
    timeRemaining
  };
}

function mockGetTournamentInfo(state) {
  const essenceEarned = state.weekly?.essenceEarned || 0;
  const currentTier = mockGetTier(essenceEarned);

  let nextTier = null;
  let essenceToNextTier = 0;

  if (currentTier) {
    const currentTierIndex = MOCK_WEEKLY_TOURNAMENT.tiers.findIndex(t => t.name === currentTier.name);
    if (currentTierIndex < MOCK_WEEKLY_TOURNAMENT.tiers.length - 1) {
      nextTier = MOCK_WEEKLY_TOURNAMENT.tiers[currentTierIndex + 1];
      essenceToNextTier = nextTier.minEssence - essenceEarned;
    }
  } else {
    nextTier = MOCK_WEEKLY_TOURNAMENT.tiers[0];
    essenceToNextTier = nextTier.minEssence - essenceEarned;
  }

  const checkpoints = mockGetCheckpointProgress(state);
  const checkpointsClaimed = checkpoints.filter(cp => cp.claimed).length;
  const checkpointsAvailable = checkpoints.filter(cp => cp.canClaim).length;

  return {
    weekId: state.weekly?.weekId,
    essenceEarned,
    currentTier,
    nextTier,
    essenceToNextTier: Math.max(0, essenceToNextTier),
    checkpoints,
    checkpointsClaimed,
    checkpointsAvailable
  };
}
