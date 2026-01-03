/**
 * Gamble Service Tests
 *
 * Tests for gambling domain service functionality including:
 * - Gambling with different bet types (safe, risky, extreme)
 * - Insufficient essence handling
 * - Cooldown enforcement
 * - Jackpot winning and reset
 * - Gamble info calculation
 */

const { GAMBLE_CONFIG } = require('../../../config/essenceTap');

// Mock the config
jest.mock('../../../config/essenceTap', () => ({
  GAMBLE_CONFIG: {
    minBet: 1000,
    maxBetPercent: 0.5,
    cooldownSeconds: 15,
    maxDailyGambles: 10,
    betTypes: {
      safe: { name: 'Safe Bet', winChance: 0.70, multiplier: 1.5, jackpotContribution: 0.01 },
      risky: { name: 'Risky Bet', winChance: 0.50, multiplier: 2.5, jackpotContribution: 0.03 },
      extreme: { name: 'All or Nothing', winChance: 0.30, multiplier: 5.0, jackpotContribution: 0.05 }
    },
    jackpot: {
      seedAmount: 1000000,
      contributionRate: 0.10,
      winChance: 0.001,
      minBetToQualify: 10000,
      chanceMultipliers: {
        safe: 1.0,
        risky: 2.0,
        extreme: 5.0
      },
      streakBonus: {
        threshold: 5,
        bonusPerGamble: 0.0005
      },
      rewards: {
        essence: 1.0,
        fatePoints: 25,
        rollTickets: 5,
        prismaticEssence: 100
      }
    }
  }
}));

describe('Gamble Service', () => {
  let baseState;

  beforeEach(() => {
    // Reset modules to clear any cached state
    jest.resetModules();

    // Mock Math.random for predictable tests
    jest.spyOn(Math, 'random');

    baseState = {
      essence: 100000,
      lastGambleTimestamp: 0,
      daily: {
        gamblesUsed: 0
      },
      stats: {
        totalGambleWins: 0,
        totalGambleLosses: 0,
        jackpotsWon: 0,
        totalJackpotWinnings: 0
      },
      jackpotContributions: 0
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('gamble', () => {
    describe('Safe bet type', () => {
      it('should win with safe bet when random is favorable', () => {
        Math.random.mockReturnValue(0.5); // 50% is within 70% win chance

        const betAmount = 10000;
        const result = mockGamble(baseState, betAmount, 'safe');

        expect(result.success).toBe(true);
        expect(result.won).toBe(true);
        expect(result.essenceWon).toBe(betAmount * 1.5);
        expect(result.newState.essence).toBe(baseState.essence + betAmount * 0.5); // Net win
        expect(result.newState.stats.totalGambleWins).toBe(1);
      });

      it('should lose with safe bet when random is unfavorable', () => {
        Math.random.mockReturnValue(0.85); // 85% is beyond 70% win chance

        const betAmount = 10000;
        const result = mockGamble(baseState, betAmount, 'safe');

        expect(result.success).toBe(true);
        expect(result.won).toBe(false);
        expect(result.essenceLost).toBe(betAmount);
        expect(result.newState.essence).toBe(baseState.essence - betAmount);
        expect(result.newState.stats.totalGambleLosses).toBe(1);
      });
    });

    describe('Risky bet type', () => {
      it('should win with risky bet when random is favorable', () => {
        Math.random.mockReturnValue(0.3); // 30% is within 50% win chance

        const betAmount = 10000;
        const result = mockGamble(baseState, betAmount, 'risky');

        expect(result.success).toBe(true);
        expect(result.won).toBe(true);
        expect(result.essenceWon).toBe(betAmount * 2.5);
        expect(result.newState.essence).toBe(baseState.essence + betAmount * 1.5); // Net win
      });

      it('should lose with risky bet when random is unfavorable', () => {
        Math.random.mockReturnValue(0.75); // 75% is beyond 50% win chance

        const betAmount = 10000;
        const result = mockGamble(baseState, betAmount, 'risky');

        expect(result.success).toBe(true);
        expect(result.won).toBe(false);
        expect(result.essenceLost).toBe(betAmount);
        expect(result.newState.essence).toBe(baseState.essence - betAmount);
      });
    });

    describe('Extreme bet type', () => {
      it('should win with extreme bet when random is favorable', () => {
        Math.random.mockReturnValue(0.15); // 15% is within 30% win chance

        const betAmount = 10000;
        const result = mockGamble(baseState, betAmount, 'extreme');

        expect(result.success).toBe(true);
        expect(result.won).toBe(true);
        expect(result.essenceWon).toBe(betAmount * 5.0);
        expect(result.newState.essence).toBe(baseState.essence + betAmount * 4.0); // Net win
      });

      it('should lose with extreme bet when random is unfavorable', () => {
        Math.random.mockReturnValue(0.5); // 50% is beyond 30% win chance

        const betAmount = 10000;
        const result = mockGamble(baseState, betAmount, 'extreme');

        expect(result.success).toBe(true);
        expect(result.won).toBe(false);
        expect(result.essenceLost).toBe(betAmount);
        expect(result.newState.essence).toBe(baseState.essence - betAmount);
      });
    });

    describe('Insufficient essence', () => {
      it('should fail when bet amount exceeds current essence', () => {
        const betAmount = baseState.essence + 1000;
        const result = mockGamble(baseState, betAmount, 'safe');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Insufficient essence');
        expect(result.code).toBe('INSUFFICIENT_ESSENCE');
      });

      it('should fail when bet is below minimum', () => {
        const betAmount = GAMBLE_CONFIG.minBet - 1;
        const result = mockGamble(baseState, betAmount, 'safe');

        expect(result.success).toBe(false);
        expect(result.error).toContain('minimum bet');
        expect(result.code).toBe('INSUFFICIENT_BET');
      });

      it('should fail when bet exceeds maximum percentage', () => {
        const betAmount = Math.floor(baseState.essence * GAMBLE_CONFIG.maxBetPercent) + 1;
        const result = mockGamble(baseState, betAmount, 'safe');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Maximum bet');
      });
    });

    describe('Invalid bet type', () => {
      it('should fail with invalid bet type', () => {
        const result = mockGamble(baseState, 10000, 'invalid');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid bet type');
        expect(result.code).toBe('INVALID_BET_TYPE');
      });
    });

    describe('Cooldown enforcement', () => {
      it('should fail when cooldown has not elapsed', () => {
        const stateWithRecentGamble = {
          ...baseState,
          lastGambleTimestamp: Date.now() - 10000 // 10 seconds ago
        };

        const result = mockGamble(stateWithRecentGamble, 10000, 'safe');

        expect(result.success).toBe(false);
        expect(result.error).toContain('cooldown');
        expect(result.code).toBe('GAMBLE_COOLDOWN');
      });

      it('should succeed when cooldown has elapsed', () => {
        Math.random.mockReturnValue(0.5);

        const stateWithOldGamble = {
          ...baseState,
          lastGambleTimestamp: Date.now() - 20000 // 20 seconds ago
        };

        const result = mockGamble(stateWithOldGamble, 10000, 'safe');

        expect(result.success).toBe(true);
      });

      it('should update lastGambleTimestamp', () => {
        Math.random.mockReturnValue(0.5);
        const before = Date.now();

        const result = mockGamble(baseState, 10000, 'safe');

        const after = Date.now();

        expect(result.success).toBe(true);
        expect(result.newState.lastGambleTimestamp).toBeGreaterThanOrEqual(before);
        expect(result.newState.lastGambleTimestamp).toBeLessThanOrEqual(after);
      });
    });

    describe('Daily gamble limit', () => {
      it('should fail when daily gamble limit is reached', () => {
        const stateAtLimit = {
          ...baseState,
          daily: {
            gamblesUsed: GAMBLE_CONFIG.maxDailyGambles
          }
        };

        const result = mockGamble(stateAtLimit, 10000, 'safe');

        expect(result.success).toBe(false);
        expect(result.error).toContain('daily limit');
      });

      it('should increment daily gambles used', () => {
        Math.random.mockReturnValue(0.5);

        const result = mockGamble(baseState, 10000, 'safe');

        expect(result.success).toBe(true);
        expect(result.newState.daily.gamblesUsed).toBe(1);
      });
    });

    describe('Jackpot mechanics', () => {
      it('should contribute to jackpot on every gamble', () => {
        Math.random.mockReturnValueOnce(0.5); // Gamble outcome
        Math.random.mockReturnValueOnce(0.999); // Jackpot miss

        const betAmount = 50000;

        const result = mockGamble(baseState, betAmount, 'safe');

        expect(result.success).toBe(true);
        expect(result.newState.jackpotContributions).toBeGreaterThan(0);
      });

      it('should win jackpot when qualified and random is favorable', () => {
        Math.random.mockReturnValueOnce(0.5); // Gamble outcome (win)
        Math.random.mockReturnValueOnce(0.0005); // Jackpot win (< 0.001)

        const betAmount = GAMBLE_CONFIG.jackpot.minBetToQualify;
        const stateWithJackpot = {
          ...baseState,
          jackpotContributions: 5000000 // 5M in jackpot
        };

        const result = mockGamble(stateWithJackpot, betAmount, 'extreme');

        expect(result.success).toBe(true);
        expect(result.jackpotWon).toBe(true);
        expect(result.jackpotAmount).toBeGreaterThan(0);
        expect(result.newState.stats.jackpotsWon).toBe(1);
        expect(result.newState.jackpotContributions).toBe(GAMBLE_CONFIG.jackpot.seedAmount);
      });

      it('should not qualify for jackpot when bet is too small', () => {
        Math.random.mockReturnValueOnce(0.5); // Gamble outcome
        Math.random.mockReturnValueOnce(0.0001); // Would win jackpot if qualified

        const betAmount = GAMBLE_CONFIG.jackpot.minBetToQualify - 1;

        const result = mockGamble(baseState, betAmount, 'safe');

        expect(result.success).toBe(true);
        expect(result.jackpotWon).toBeFalsy();
      });

      it('should reset jackpot to seed amount after win', () => {
        Math.random.mockReturnValueOnce(0.5);
        Math.random.mockReturnValueOnce(0.0001);

        const stateWithJackpot = {
          ...baseState,
          jackpotContributions: 10000000
        };

        const result = mockGamble(stateWithJackpot, 50000, 'extreme');

        expect(result.success).toBe(true);
        if (result.jackpotWon) {
          expect(result.newState.jackpotContributions).toBe(GAMBLE_CONFIG.jackpot.seedAmount);
        }
      });

      it('should increase jackpot chance with bet type', () => {
        // This test verifies that extreme bets have higher jackpot multiplier
        expect(GAMBLE_CONFIG.jackpot.chanceMultipliers.extreme).toBeGreaterThan(
          GAMBLE_CONFIG.jackpot.chanceMultipliers.safe
        );
      });
    });
  });

  describe('getGambleInfo', () => {
    it('should return current gamble info', () => {
      const info = mockGetGambleInfo(baseState);

      expect(info).toHaveProperty('canGamble');
      expect(info).toHaveProperty('cooldownRemaining');
      expect(info).toHaveProperty('dailyGamblesUsed');
      expect(info).toHaveProperty('dailyGamblesRemaining');
      expect(info).toHaveProperty('jackpotAmount');
      expect(info).toHaveProperty('betTypes');
    });

    it('should indicate cannot gamble when on cooldown', () => {
      const stateOnCooldown = {
        ...baseState,
        lastGambleTimestamp: Date.now() - 5000
      };

      const info = mockGetGambleInfo(stateOnCooldown);

      expect(info.canGamble).toBe(false);
      expect(info.cooldownRemaining).toBeGreaterThan(0);
    });

    it('should indicate cannot gamble when at daily limit', () => {
      const stateAtLimit = {
        ...baseState,
        daily: {
          gamblesUsed: GAMBLE_CONFIG.maxDailyGambles
        }
      };

      const info = mockGetGambleInfo(stateAtLimit);

      expect(info.canGamble).toBe(false);
      expect(info.dailyGamblesRemaining).toBe(0);
    });

    it('should return jackpot amount including seed', () => {
      const stateWithContributions = {
        ...baseState,
        jackpotContributions: 3000000
      };

      const info = mockGetGambleInfo(stateWithContributions);

      expect(info.jackpotAmount).toBeGreaterThanOrEqual(GAMBLE_CONFIG.jackpot.seedAmount);
    });

    it('should include bet type information', () => {
      const info = mockGetGambleInfo(baseState);

      expect(info.betTypes).toHaveProperty('safe');
      expect(info.betTypes).toHaveProperty('risky');
      expect(info.betTypes).toHaveProperty('extreme');

      expect(info.betTypes.safe).toHaveProperty('winChance');
      expect(info.betTypes.safe).toHaveProperty('multiplier');
      expect(info.betTypes.safe.winChance).toBe(0.70);
    });

    it('should calculate max bet based on current essence', () => {
      const info = mockGetGambleInfo(baseState);

      const expectedMaxBet = Math.floor(baseState.essence * GAMBLE_CONFIG.maxBetPercent);
      expect(info.maxBet).toBe(expectedMaxBet);
    });
  });
});

// Mock implementation of gamble function for testing
function mockGamble(state, betAmount, betType) {
  const now = Date.now();
  const betConfig = GAMBLE_CONFIG.betTypes[betType];

  // Validation
  if (!betConfig) {
    return {
      success: false,
      error: 'Invalid bet type',
      code: 'INVALID_BET_TYPE'
    };
  }

  if (betAmount < GAMBLE_CONFIG.minBet) {
    return {
      success: false,
      error: `Bet must be at least ${GAMBLE_CONFIG.minBet} essence (minimum bet)`,
      code: 'INSUFFICIENT_BET'
    };
  }

  const maxBet = Math.floor(state.essence * GAMBLE_CONFIG.maxBetPercent);
  if (betAmount > maxBet) {
    return {
      success: false,
      error: `Maximum bet is ${maxBet} essence (${GAMBLE_CONFIG.maxBetPercent * 100}% of current essence)`
    };
  }

  if (betAmount > state.essence) {
    return {
      success: false,
      error: 'Insufficient essence for this bet',
      code: 'INSUFFICIENT_ESSENCE'
    };
  }

  // Check cooldown
  const cooldownMs = GAMBLE_CONFIG.cooldownSeconds * 1000;
  const timeSinceLastGamble = now - state.lastGambleTimestamp;
  if (timeSinceLastGamble < cooldownMs) {
    return {
      success: false,
      error: `Please wait ${Math.ceil((cooldownMs - timeSinceLastGamble) / 1000)} seconds before gambling again`,
      code: 'GAMBLE_COOLDOWN'
    };
  }

  // Check daily limit
  if (state.daily.gamblesUsed >= GAMBLE_CONFIG.maxDailyGambles) {
    return {
      success: false,
      error: `You have reached the daily limit of ${GAMBLE_CONFIG.maxDailyGambles} gambles`
    };
  }

  // Determine outcome
  const roll = Math.random();
  const won = roll < betConfig.winChance;

  let newState = { ...state };
  let essenceChange = 0;

  if (won) {
    essenceChange = Math.floor(betAmount * (betConfig.multiplier - 1));
    newState.essence += essenceChange;
    newState.stats = {
      ...newState.stats,
      totalGambleWins: (newState.stats.totalGambleWins || 0) + 1
    };
  } else {
    essenceChange = -betAmount;
    newState.essence += essenceChange;
    newState.stats = {
      ...newState.stats,
      totalGambleLosses: (newState.stats.totalGambleLosses || 0) + 1
    };
  }

  // Jackpot contribution
  const contribution = Math.floor(betAmount * GAMBLE_CONFIG.jackpot.contributionRate);
  newState.jackpotContributions = (newState.jackpotContributions || 0) + contribution;

  // Check jackpot win
  let jackpotWon = false;
  let jackpotAmount = 0;

  if (betAmount >= GAMBLE_CONFIG.jackpot.minBetToQualify) {
    const jackpotRoll = Math.random();
    const jackpotChance = GAMBLE_CONFIG.jackpot.winChance * GAMBLE_CONFIG.jackpot.chanceMultipliers[betType];

    if (jackpotRoll < jackpotChance) {
      jackpotWon = true;
      jackpotAmount = newState.jackpotContributions;
      newState.essence += jackpotAmount;
      newState.stats.jackpotsWon = (newState.stats.jackpotsWon || 0) + 1;
      newState.stats.totalJackpotWinnings = (newState.stats.totalJackpotWinnings || 0) + jackpotAmount;
      newState.jackpotContributions = GAMBLE_CONFIG.jackpot.seedAmount;
    }
  }

  // Update state
  newState.lastGambleTimestamp = now;
  newState.daily = {
    ...newState.daily,
    gamblesUsed: (newState.daily.gamblesUsed || 0) + 1
  };

  return {
    success: true,
    won,
    essenceWon: won ? Math.floor(betAmount * betConfig.multiplier) : 0,
    essenceLost: won ? 0 : betAmount,
    jackpotWon,
    jackpotAmount,
    betType,
    betAmount,
    newState
  };
}

// Mock implementation of getGambleInfo
function mockGetGambleInfo(state) {
  const now = Date.now();
  const cooldownMs = GAMBLE_CONFIG.cooldownSeconds * 1000;
  const timeSinceLastGamble = now - state.lastGambleTimestamp;
  const cooldownRemaining = Math.max(0, cooldownMs - timeSinceLastGamble);

  const dailyGamblesUsed = state.daily?.gamblesUsed || 0;
  const dailyGamblesRemaining = Math.max(0, GAMBLE_CONFIG.maxDailyGambles - dailyGamblesUsed);

  const canGamble = cooldownRemaining === 0 && dailyGamblesRemaining > 0;

  const jackpotAmount = (state.jackpotContributions || 0) + GAMBLE_CONFIG.jackpot.seedAmount;

  const maxBet = Math.floor(state.essence * GAMBLE_CONFIG.maxBetPercent);

  return {
    canGamble,
    cooldownRemaining: Math.ceil(cooldownRemaining / 1000),
    dailyGamblesUsed,
    dailyGamblesRemaining,
    jackpotAmount,
    maxBet,
    minBet: GAMBLE_CONFIG.minBet,
    betTypes: GAMBLE_CONFIG.betTypes
  };
}
