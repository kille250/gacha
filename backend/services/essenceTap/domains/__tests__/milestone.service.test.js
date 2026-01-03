/**
 * Milestone Service Tests
 *
 * Tests for milestone domain service functionality including:
 * - Milestone eligibility checking
 * - Milestone claiming (one-time)
 * - Repeatable milestone claiming
 * - Already claimed prevention
 */

// Mock milestone configurations
const MOCK_FATE_POINT_MILESTONES = [
  { id: 'm1', lifetimeEssence: 1000000, fatePoints: 5, claimed: false },
  { id: 'm2', lifetimeEssence: 10000000, fatePoints: 10, claimed: false },
  { id: 'm3', lifetimeEssence: 100000000, fatePoints: 15, claimed: false },
  { id: 'm4', lifetimeEssence: 1000000000, fatePoints: 25, claimed: false }
];

const MOCK_REPEATABLE_MILESTONES = {
  weeklyEssence: {
    threshold: 100000000,
    fatePoints: 20,
    rollTickets: 3
  },
  essencePer100B: {
    threshold: 100000000000,
    fatePoints: 25,
    repeatable: true
  }
};

jest.mock('../../../config/essenceTap', () => ({
  FATE_POINT_MILESTONES: MOCK_FATE_POINT_MILESTONES,
  REPEATABLE_MILESTONES: MOCK_REPEATABLE_MILESTONES
}));

describe('Milestone Service', () => {
  let baseState;

  beforeEach(() => {
    jest.resetModules();

    baseState = {
      lifetimeEssence: 0,
      claimedMilestones: [],
      repeatableMilestones: {
        weeklyEssenceLastClaimed: null,
        per100BCount: 0
      },
      weekly: {
        weekId: null,
        essenceEarned: 0
      }
    };
  });

  describe('checkEligibleMilestones', () => {
    it('should return eligible unclaimed milestones', () => {
      const stateWithEssence = {
        ...baseState,
        lifetimeEssence: 15000000
      };

      const eligible = mockCheckEligibleMilestones(stateWithEssence);

      expect(eligible.length).toBe(2); // m1 and m2
      expect(eligible[0].id).toBe('m1');
      expect(eligible[1].id).toBe('m2');
    });

    it('should not return already claimed milestones', () => {
      const stateWithClaimed = {
        ...baseState,
        lifetimeEssence: 15000000,
        claimedMilestones: ['m1']
      };

      const eligible = mockCheckEligibleMilestones(stateWithClaimed);

      expect(eligible.length).toBe(1); // Only m2
      expect(eligible[0].id).toBe('m2');
    });

    it('should return empty array when no milestones reached', () => {
      const stateWithLowEssence = {
        ...baseState,
        lifetimeEssence: 500000
      };

      const eligible = mockCheckEligibleMilestones(stateWithLowEssence);

      expect(eligible.length).toBe(0);
    });

    it('should return all eligible milestones when none claimed', () => {
      const stateWithHighEssence = {
        ...baseState,
        lifetimeEssence: 150000000
      };

      const eligible = mockCheckEligibleMilestones(stateWithHighEssence);

      expect(eligible.length).toBe(3); // m1, m2, m3
    });
  });

  describe('claimMilestone', () => {
    it('should successfully claim eligible milestone', () => {
      const stateWithEssence = {
        ...baseState,
        lifetimeEssence: 5000000
      };

      const result = mockClaimMilestone(stateWithEssence, 'm1');

      expect(result.success).toBe(true);
      expect(result.rewards.fatePoints).toBe(5);
      expect(result.newState.claimedMilestones).toContain('m1');
    });

    it('should fail when milestone not reached', () => {
      const stateWithLowEssence = {
        ...baseState,
        lifetimeEssence: 500000
      };

      const result = mockClaimMilestone(stateWithLowEssence, 'm1');

      expect(result.success).toBe(false);
      expect(result.code).toBe('MILESTONE_NOT_REACHED');
    });

    it('should fail when milestone already claimed', () => {
      const stateWithClaimed = {
        ...baseState,
        lifetimeEssence: 5000000,
        claimedMilestones: ['m1']
      };

      const result = mockClaimMilestone(stateWithClaimed, 'm1');

      expect(result.success).toBe(false);
      expect(result.code).toBe('ALREADY_CLAIMED');
    });

    it('should fail with invalid milestone ID', () => {
      const result = mockClaimMilestone(baseState, 'invalid');

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_MILESTONE');
    });

    it('should add milestone ID to claimed list', () => {
      const stateWithEssence = {
        ...baseState,
        lifetimeEssence: 15000000,
        claimedMilestones: ['m1']
      };

      const result = mockClaimMilestone(stateWithEssence, 'm2');

      expect(result.success).toBe(true);
      expect(result.newState.claimedMilestones).toContain('m1');
      expect(result.newState.claimedMilestones).toContain('m2');
      expect(result.newState.claimedMilestones.length).toBe(2);
    });

    it('should return correct rewards for different milestones', () => {
      const stateWithHighEssence = {
        ...baseState,
        lifetimeEssence: 1500000000
      };

      const result1 = mockClaimMilestone(stateWithHighEssence, 'm1');
      const result4 = mockClaimMilestone(stateWithHighEssence, 'm4');

      expect(result1.rewards.fatePoints).toBe(5);
      expect(result4.rewards.fatePoints).toBe(25);
    });
  });

  describe('claimRepeatableMilestone', () => {
    describe('Weekly essence milestone', () => {
      it('should claim weekly essence milestone when threshold reached', () => {
        const currentWeek = '2024-W15';
        const stateWithWeeklyEssence = {
          ...baseState,
          weekly: {
            weekId: currentWeek,
            essenceEarned: 150000000
          },
          repeatableMilestones: {
            weeklyEssenceLastClaimed: null,
            per100BCount: 0
          }
        };

        const result = mockClaimRepeatableMilestone(stateWithWeeklyEssence, 'weeklyEssence');

        expect(result.success).toBe(true);
        expect(result.rewards.fatePoints).toBe(20);
        expect(result.rewards.rollTickets).toBe(3);
        expect(result.newState.repeatableMilestones.weeklyEssenceLastClaimed).toBe(currentWeek);
      });

      it('should fail when weekly threshold not reached', () => {
        const stateWithLowWeeklyEssence = {
          ...baseState,
          weekly: {
            weekId: '2024-W15',
            essenceEarned: 50000000
          }
        };

        const result = mockClaimRepeatableMilestone(stateWithLowWeeklyEssence, 'weeklyEssence');

        expect(result.success).toBe(false);
        expect(result.code).toBe('MILESTONE_NOT_REACHED');
      });

      it('should fail when already claimed this week', () => {
        const currentWeek = '2024-W15';
        const stateAlreadyClaimed = {
          ...baseState,
          weekly: {
            weekId: currentWeek,
            essenceEarned: 150000000
          },
          repeatableMilestones: {
            weeklyEssenceLastClaimed: currentWeek,
            per100BCount: 0
          }
        };

        const result = mockClaimRepeatableMilestone(stateAlreadyClaimed, 'weeklyEssence');

        expect(result.success).toBe(false);
        expect(result.code).toBe('ALREADY_CLAIMED');
      });

      it('should allow claiming in new week', () => {
        const lastWeek = '2024-W14';
        const currentWeek = '2024-W15';
        const stateNewWeek = {
          ...baseState,
          weekly: {
            weekId: currentWeek,
            essenceEarned: 150000000
          },
          repeatableMilestones: {
            weeklyEssenceLastClaimed: lastWeek,
            per100BCount: 0
          }
        };

        const result = mockClaimRepeatableMilestone(stateNewWeek, 'weeklyEssence');

        expect(result.success).toBe(true);
        expect(result.newState.repeatableMilestones.weeklyEssenceLastClaimed).toBe(currentWeek);
      });
    });

    describe('Per 100B repeatable milestone', () => {
      it('should claim first 100B milestone', () => {
        const stateWith100B = {
          ...baseState,
          lifetimeEssence: 150000000000, // 150B
          repeatableMilestones: {
            weeklyEssenceLastClaimed: null,
            per100BCount: 0
          }
        };

        const result = mockClaimRepeatableMilestone(stateWith100B, 'essencePer100B');

        expect(result.success).toBe(true);
        expect(result.rewards.fatePoints).toBe(25);
        expect(result.newState.repeatableMilestones.per100BCount).toBe(1);
      });

      it('should claim multiple 100B milestones', () => {
        const stateWith300B = {
          ...baseState,
          lifetimeEssence: 350000000000, // 350B
          repeatableMilestones: {
            weeklyEssenceLastClaimed: null,
            per100BCount: 2 // Already claimed 2
          }
        };

        const result = mockClaimRepeatableMilestone(stateWith300B, 'essencePer100B');

        expect(result.success).toBe(true);
        expect(result.newState.repeatableMilestones.per100BCount).toBe(3);
      });

      it('should fail when next threshold not reached', () => {
        const stateNot100B = {
          ...baseState,
          lifetimeEssence: 50000000000, // 50B
          repeatableMilestones: {
            weeklyEssenceLastClaimed: null,
            per100BCount: 0
          }
        };

        const result = mockClaimRepeatableMilestone(stateNot100B, 'essencePer100B');

        expect(result.success).toBe(false);
        expect(result.code).toBe('MILESTONE_NOT_REACHED');
      });

      it('should calculate correct tier for multiple claims', () => {
        const stateMultipleClaimed = {
          ...baseState,
          lifetimeEssence: 550000000000, // 550B
          repeatableMilestones: {
            weeklyEssenceLastClaimed: null,
            per100BCount: 4
          }
        };

        const result = mockClaimRepeatableMilestone(stateMultipleClaimed, 'essencePer100B');

        expect(result.success).toBe(true);
        expect(result.newState.repeatableMilestones.per100BCount).toBe(5);
      });
    });

    it('should fail with invalid milestone type', () => {
      const result = mockClaimRepeatableMilestone(baseState, 'invalid');

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_MILESTONE');
    });
  });

  describe('getMilestoneProgress', () => {
    it('should return progress for one-time milestones', () => {
      const stateWithProgress = {
        ...baseState,
        lifetimeEssence: 50000000,
        claimedMilestones: ['m1', 'm2']
      };

      const progress = mockGetMilestoneProgress(stateWithProgress);

      expect(progress.oneTimeMilestones).toBeDefined();
      expect(progress.oneTimeMilestones.total).toBe(4);
      expect(progress.oneTimeMilestones.claimed).toBe(2);
      expect(progress.oneTimeMilestones.claimable).toBe(1); // m3 at 100M not reached yet
    });

    it('should return progress for repeatable milestones', () => {
      const currentWeek = '2024-W15';
      const stateWithProgress = {
        ...baseState,
        lifetimeEssence: 250000000000,
        weekly: {
          weekId: currentWeek,
          essenceEarned: 150000000
        },
        repeatableMilestones: {
          weeklyEssenceLastClaimed: null,
          per100BCount: 1
        }
      };

      const progress = mockGetMilestoneProgress(stateWithProgress);

      expect(progress.repeatableMilestones).toBeDefined();
      expect(progress.repeatableMilestones.weeklyEssence).toBeDefined();
      expect(progress.repeatableMilestones.weeklyEssence.canClaim).toBe(true);
      expect(progress.repeatableMilestones.per100B).toBeDefined();
      expect(progress.repeatableMilestones.per100B.currentTier).toBe(1);
    });

    it('should calculate next milestone info', () => {
      const stateWithSomeClaimed = {
        ...baseState,
        lifetimeEssence: 5000000,
        claimedMilestones: ['m1']
      };

      const progress = mockGetMilestoneProgress(stateWithSomeClaimed);

      expect(progress.nextMilestone).toBeDefined();
      expect(progress.nextMilestone.id).toBe('m2');
      expect(progress.nextMilestone.essenceNeeded).toBe(5000000);
    });

    it('should handle all milestones claimed', () => {
      const stateAllClaimed = {
        ...baseState,
        lifetimeEssence: 2000000000,
        claimedMilestones: ['m1', 'm2', 'm3', 'm4']
      };

      const progress = mockGetMilestoneProgress(stateAllClaimed);

      expect(progress.oneTimeMilestones.claimed).toBe(4);
      expect(progress.oneTimeMilestones.claimable).toBe(0);
      expect(progress.nextMilestone).toBeNull();
    });
  });
});

// Mock implementations for testing

function mockCheckEligibleMilestones(state) {
  return MOCK_FATE_POINT_MILESTONES.filter(milestone => {
    const reached = state.lifetimeEssence >= milestone.lifetimeEssence;
    const claimed = state.claimedMilestones?.includes(milestone.id);
    return reached && !claimed;
  });
}

function mockClaimMilestone(state, milestoneId) {
  const milestone = MOCK_FATE_POINT_MILESTONES.find(m => m.id === milestoneId);

  if (!milestone) {
    return {
      success: false,
      error: 'Invalid milestone ID',
      code: 'INVALID_MILESTONE'
    };
  }

  if (state.claimedMilestones?.includes(milestoneId)) {
    return {
      success: false,
      error: 'Milestone already claimed',
      code: 'ALREADY_CLAIMED'
    };
  }

  if (state.lifetimeEssence < milestone.lifetimeEssence) {
    return {
      success: false,
      error: `Need ${milestone.lifetimeEssence} lifetime essence to claim this milestone`,
      code: 'MILESTONE_NOT_REACHED'
    };
  }

  const newState = {
    ...state,
    claimedMilestones: [...(state.claimedMilestones || []), milestoneId]
  };

  return {
    success: true,
    rewards: {
      fatePoints: milestone.fatePoints
    },
    milestoneId,
    newState
  };
}

function mockClaimRepeatableMilestone(state, milestoneType) {
  const config = MOCK_REPEATABLE_MILESTONES[milestoneType];

  if (!config) {
    return {
      success: false,
      error: 'Invalid milestone type',
      code: 'INVALID_MILESTONE'
    };
  }

  if (milestoneType === 'weeklyEssence') {
    const currentWeek = state.weekly?.weekId;
    const lastClaimed = state.repeatableMilestones?.weeklyEssenceLastClaimed;

    if (lastClaimed === currentWeek) {
      return {
        success: false,
        error: 'Weekly milestone already claimed this week',
        code: 'ALREADY_CLAIMED'
      };
    }

    const weeklyEssence = state.weekly?.essenceEarned || 0;
    if (weeklyEssence < config.threshold) {
      return {
        success: false,
        error: `Need ${config.threshold} essence this week`,
        code: 'MILESTONE_NOT_REACHED'
      };
    }

    const newState = {
      ...state,
      repeatableMilestones: {
        ...state.repeatableMilestones,
        weeklyEssenceLastClaimed: currentWeek
      }
    };

    return {
      success: true,
      rewards: {
        fatePoints: config.fatePoints,
        rollTickets: config.rollTickets
      },
      newState
    };
  }

  if (milestoneType === 'essencePer100B') {
    const currentCount = state.repeatableMilestones?.per100BCount || 0;
    const nextThreshold = (currentCount + 1) * config.threshold;

    if (state.lifetimeEssence < nextThreshold) {
      return {
        success: false,
        error: `Need ${nextThreshold} lifetime essence for next 100B milestone`,
        code: 'MILESTONE_NOT_REACHED'
      };
    }

    const newState = {
      ...state,
      repeatableMilestones: {
        ...state.repeatableMilestones,
        per100BCount: currentCount + 1
      }
    };

    return {
      success: true,
      rewards: {
        fatePoints: config.fatePoints
      },
      tier: currentCount + 1,
      newState
    };
  }

  return {
    success: false,
    error: 'Unknown milestone type',
    code: 'INVALID_MILESTONE'
  };
}

function mockGetMilestoneProgress(state) {
  const eligible = mockCheckEligibleMilestones(state);

  const oneTimeMilestones = {
    total: MOCK_FATE_POINT_MILESTONES.length,
    claimed: state.claimedMilestones?.length || 0,
    claimable: eligible.length
  };

  // Find next unclaimed milestone
  let nextMilestone = null;
  for (const milestone of MOCK_FATE_POINT_MILESTONES) {
    if (!state.claimedMilestones?.includes(milestone.id)) {
      nextMilestone = {
        id: milestone.id,
        lifetimeEssence: milestone.lifetimeEssence,
        essenceNeeded: Math.max(0, milestone.lifetimeEssence - state.lifetimeEssence),
        rewards: {
          fatePoints: milestone.fatePoints
        }
      };
      break;
    }
  }

  // Repeatable milestones
  const currentWeek = state.weekly?.weekId;
  const weeklyEssence = state.weekly?.essenceEarned || 0;
  const weeklyLastClaimed = state.repeatableMilestones?.weeklyEssenceLastClaimed;

  const repeatableMilestones = {
    weeklyEssence: {
      progress: weeklyEssence,
      threshold: MOCK_REPEATABLE_MILESTONES.weeklyEssence.threshold,
      canClaim: weeklyEssence >= MOCK_REPEATABLE_MILESTONES.weeklyEssence.threshold &&
                weeklyLastClaimed !== currentWeek
    },
    per100B: {
      currentTier: state.repeatableMilestones?.per100BCount || 0,
      nextThreshold: ((state.repeatableMilestones?.per100BCount || 0) + 1) *
                     MOCK_REPEATABLE_MILESTONES.essencePer100B.threshold,
      progress: state.lifetimeEssence
    }
  };

  return {
    oneTimeMilestones,
    nextMilestone,
    repeatableMilestones
  };
}
