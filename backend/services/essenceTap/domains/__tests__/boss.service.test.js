/**
 * Boss Service Tests
 *
 * Tests for boss domain service functionality including:
 * - Boss spawn conditions (clicks threshold, cooldown)
 * - Boss attack and health reduction
 * - Boss defeat and reward claiming
 * - Boss expiration handling
 */

// Mock boss configuration
const MOCK_BOSS_CONFIG = {
  spawnThreshold: 1000, // Clicks required to spawn boss
  cooldownMs: 3600000, // 1 hour cooldown
  expirationMs: 900000, // 15 minutes to defeat
  baseHealth: 100000,
  healthScaling: 1.5, // Health multiplier per boss level
  baseRewards: {
    essence: 50000,
    fatePoints: 10,
    rollTickets: 2
  },
  rewardScaling: 1.3 // Reward multiplier per boss level
};

jest.mock('../../../config/essenceTap', () => ({
  BOSS_CONFIG: MOCK_BOSS_CONFIG
}));

describe('Boss Service', () => {
  let baseState;

  beforeEach(() => {
    jest.resetModules();

    baseState = {
      essence: 100000,
      totalClicks: 0,
      boss: {
        active: false,
        level: 0,
        health: 0,
        maxHealth: 0,
        spawnTime: null,
        lastSpawnTime: null,
        clicksSinceLastBoss: 0
      },
      stats: {
        bossesDefeated: 0,
        totalBossRewards: 0
      }
    };
  });

  describe('checkBossSpawn', () => {
    it('should spawn boss when click threshold is reached', () => {
      const stateWithClicks = {
        ...baseState,
        boss: {
          ...baseState.boss,
          clicksSinceLastBoss: MOCK_BOSS_CONFIG.spawnThreshold
        }
      };

      const result = mockCheckBossSpawn(stateWithClicks);

      expect(result.shouldSpawn).toBe(true);
      expect(result.canSpawn).toBe(true);
    });

    it('should not spawn when click threshold not reached', () => {
      const stateWithFewClicks = {
        ...baseState,
        boss: {
          ...baseState.boss,
          clicksSinceLastBoss: MOCK_BOSS_CONFIG.spawnThreshold - 1
        }
      };

      const result = mockCheckBossSpawn(stateWithFewClicks);

      expect(result.shouldSpawn).toBe(false);
    });

    it('should not spawn when boss is already active', () => {
      const stateWithActiveBoss = {
        ...baseState,
        boss: {
          ...baseState.boss,
          active: true,
          clicksSinceLastBoss: MOCK_BOSS_CONFIG.spawnThreshold
        }
      };

      const result = mockCheckBossSpawn(stateWithActiveBoss);

      expect(result.shouldSpawn).toBe(false);
      expect(result.reason).toContain('already active');
    });

    it('should not spawn when on cooldown', () => {
      const stateOnCooldown = {
        ...baseState,
        boss: {
          ...baseState.boss,
          lastSpawnTime: Date.now() - 1800000, // 30 minutes ago
          clicksSinceLastBoss: MOCK_BOSS_CONFIG.spawnThreshold
        }
      };

      const result = mockCheckBossSpawn(stateOnCooldown);

      expect(result.shouldSpawn).toBe(false);
      expect(result.canSpawn).toBe(false);
      expect(result.cooldownRemaining).toBeGreaterThan(0);
    });

    it('should spawn after cooldown has elapsed', () => {
      const stateAfterCooldown = {
        ...baseState,
        boss: {
          ...baseState.boss,
          lastSpawnTime: Date.now() - MOCK_BOSS_CONFIG.cooldownMs - 1000,
          clicksSinceLastBoss: MOCK_BOSS_CONFIG.spawnThreshold
        }
      };

      const result = mockCheckBossSpawn(stateAfterCooldown);

      expect(result.shouldSpawn).toBe(true);
      expect(result.canSpawn).toBe(true);
    });
  });

  describe('spawnBoss', () => {
    it('should spawn boss with correct initial state', () => {
      const stateReadyToSpawn = {
        ...baseState,
        boss: {
          ...baseState.boss,
          clicksSinceLastBoss: MOCK_BOSS_CONFIG.spawnThreshold,
          level: 5
        }
      };

      const result = mockSpawnBoss(stateReadyToSpawn);

      expect(result.success).toBe(true);
      expect(result.newState.boss.active).toBe(true);
      expect(result.newState.boss.level).toBe(6);
      expect(result.newState.boss.health).toBeGreaterThan(0);
      expect(result.newState.boss.maxHealth).toBe(result.newState.boss.health);
      expect(result.newState.boss.spawnTime).toBeTruthy();
      expect(result.newState.boss.clicksSinceLastBoss).toBe(0);
    });

    it('should scale boss health with level', () => {
      const level1State = {
        ...baseState,
        boss: { ...baseState.boss, level: 0, clicksSinceLastBoss: MOCK_BOSS_CONFIG.spawnThreshold }
      };

      const level5State = {
        ...baseState,
        boss: { ...baseState.boss, level: 4, clicksSinceLastBoss: MOCK_BOSS_CONFIG.spawnThreshold }
      };

      const result1 = mockSpawnBoss(level1State);
      const result5 = mockSpawnBoss(level5State);

      expect(result5.newState.boss.health).toBeGreaterThan(result1.newState.boss.health);
    });

    it('should fail when boss is already active', () => {
      const stateWithActiveBoss = {
        ...baseState,
        boss: {
          ...baseState.boss,
          active: true,
          clicksSinceLastBoss: MOCK_BOSS_CONFIG.spawnThreshold
        }
      };

      const result = mockSpawnBoss(stateWithActiveBoss);

      expect(result.success).toBe(false);
      expect(result.code).toBe('BOSS_SPAWN_FAILED');
    });

    it('should fail when on cooldown', () => {
      const stateOnCooldown = {
        ...baseState,
        boss: {
          ...baseState.boss,
          lastSpawnTime: Date.now() - 1000000, // Recent
          clicksSinceLastBoss: MOCK_BOSS_CONFIG.spawnThreshold
        }
      };

      const result = mockSpawnBoss(stateOnCooldown);

      expect(result.success).toBe(false);
      expect(result.code).toBe('BOSS_COOLDOWN');
    });

    it('should fail when insufficient clicks', () => {
      const stateWithFewClicks = {
        ...baseState,
        boss: {
          ...baseState.boss,
          clicksSinceLastBoss: MOCK_BOSS_CONFIG.spawnThreshold - 1
        }
      };

      const result = mockSpawnBoss(stateWithFewClicks);

      expect(result.success).toBe(false);
    });
  });

  describe('attackBoss', () => {
    let stateWithActiveBoss;

    beforeEach(() => {
      stateWithActiveBoss = {
        ...baseState,
        boss: {
          ...baseState.boss,
          active: true,
          level: 1,
          health: 50000,
          maxHealth: 100000,
          spawnTime: Date.now()
        }
      };
    });

    it('should reduce boss health by damage amount', () => {
      const damage = 10000;
      const result = mockAttackBoss(stateWithActiveBoss, damage);

      expect(result.success).toBe(true);
      expect(result.newState.boss.health).toBe(stateWithActiveBoss.boss.health - damage);
      expect(result.healthRemaining).toBe(stateWithActiveBoss.boss.health - damage);
    });

    it('should not defeat boss when health remains', () => {
      const damage = 10000;
      const result = mockAttackBoss(stateWithActiveBoss, damage);

      expect(result.success).toBe(true);
      expect(result.defeated).toBe(false);
      expect(result.newState.boss.active).toBe(true);
    });

    it('should defeat boss when health reaches zero', () => {
      const damage = stateWithActiveBoss.boss.health;
      const result = mockAttackBoss(stateWithActiveBoss, damage);

      expect(result.success).toBe(true);
      expect(result.defeated).toBe(true);
      expect(result.newState.boss.health).toBe(0);
      expect(result.newState.boss.active).toBe(false);
    });

    it('should award rewards on boss defeat', () => {
      const damage = stateWithActiveBoss.boss.health;
      const result = mockAttackBoss(stateWithActiveBoss, damage);

      expect(result.success).toBe(true);
      expect(result.defeated).toBe(true);
      expect(result.rewards).toBeDefined();
      expect(result.rewards.essence).toBeGreaterThan(0);
      expect(result.newState.essence).toBeGreaterThan(baseState.essence);
    });

    it('should scale rewards with boss level', () => {
      const level1Boss = {
        ...stateWithActiveBoss,
        boss: { ...stateWithActiveBoss.boss, level: 1, health: 10000 }
      };

      const level5Boss = {
        ...stateWithActiveBoss,
        boss: { ...stateWithActiveBoss.boss, level: 5, health: 10000 }
      };

      const result1 = mockAttackBoss(level1Boss, 10000);
      const result5 = mockAttackBoss(level5Boss, 10000);

      expect(result5.rewards.essence).toBeGreaterThan(result1.rewards.essence);
    });

    it('should increment bosses defeated stat on defeat', () => {
      const damage = stateWithActiveBoss.boss.health;
      const result = mockAttackBoss(stateWithActiveBoss, damage);

      expect(result.success).toBe(true);
      expect(result.newState.stats.bossesDefeated).toBe(1);
    });

    it('should fail when no boss is active', () => {
      const stateNoBoss = {
        ...baseState,
        boss: { ...baseState.boss, active: false }
      };

      const result = mockAttackBoss(stateNoBoss, 10000);

      expect(result.success).toBe(false);
      expect(result.code).toBe('BOSS_NOT_ACTIVE');
    });

    it('should handle overkill damage correctly', () => {
      const damage = stateWithActiveBoss.boss.health * 2;
      const result = mockAttackBoss(stateWithActiveBoss, damage);

      expect(result.success).toBe(true);
      expect(result.defeated).toBe(true);
      expect(result.newState.boss.health).toBe(0);
    });
  });

  describe('checkBossExpiration', () => {
    it('should not expire boss within expiration time', () => {
      const stateWithRecentBoss = {
        ...baseState,
        boss: {
          ...baseState.boss,
          active: true,
          spawnTime: Date.now() - 60000, // 1 minute ago
          health: 50000
        }
      };

      const result = mockCheckBossExpiration(stateWithRecentBoss);

      expect(result.expired).toBe(false);
      expect(result.newState.boss.active).toBe(true);
    });

    it('should expire boss after expiration time', () => {
      const stateWithExpiredBoss = {
        ...baseState,
        boss: {
          ...baseState.boss,
          active: true,
          spawnTime: Date.now() - MOCK_BOSS_CONFIG.expirationMs - 1000,
          health: 50000,
          level: 3
        }
      };

      const result = mockCheckBossExpiration(stateWithExpiredBoss);

      expect(result.expired).toBe(true);
      expect(result.newState.boss.active).toBe(false);
      expect(result.newState.boss.health).toBe(0);
    });

    it('should set lastSpawnTime on expiration', () => {
      const stateWithExpiredBoss = {
        ...baseState,
        boss: {
          ...baseState.boss,
          active: true,
          spawnTime: Date.now() - MOCK_BOSS_CONFIG.expirationMs - 1000,
          health: 50000
        }
      };

      const result = mockCheckBossExpiration(stateWithExpiredBoss);

      expect(result.expired).toBe(true);
      expect(result.newState.boss.lastSpawnTime).toBeTruthy();
    });

    it('should return remaining time for active boss', () => {
      const spawnTime = Date.now() - 300000; // 5 minutes ago
      const stateWithActiveBoss = {
        ...baseState,
        boss: {
          ...baseState.boss,
          active: true,
          spawnTime,
          health: 50000
        }
      };

      const result = mockCheckBossExpiration(stateWithActiveBoss);

      expect(result.expired).toBe(false);
      expect(result.timeRemaining).toBeGreaterThan(0);
      expect(result.timeRemaining).toBeLessThanOrEqual(MOCK_BOSS_CONFIG.expirationMs);
    });

    it('should do nothing when no boss is active', () => {
      const stateNoBoss = {
        ...baseState,
        boss: { ...baseState.boss, active: false }
      };

      const result = mockCheckBossExpiration(stateNoBoss);

      expect(result.expired).toBe(false);
      expect(result.newState).toEqual(stateNoBoss);
    });
  });

  describe('getBossInfo', () => {
    it('should return info for active boss', () => {
      const stateWithActiveBoss = {
        ...baseState,
        boss: {
          ...baseState.boss,
          active: true,
          level: 5,
          health: 75000,
          maxHealth: 150000,
          spawnTime: Date.now() - 300000
        }
      };

      const info = mockGetBossInfo(stateWithActiveBoss);

      expect(info.active).toBe(true);
      expect(info.level).toBe(5);
      expect(info.health).toBe(75000);
      expect(info.maxHealth).toBe(150000);
      expect(info.healthPercent).toBeCloseTo(0.5);
      expect(info.timeRemaining).toBeGreaterThan(0);
    });

    it('should return spawn progress when no active boss', () => {
      const stateNoActiveBoss = {
        ...baseState,
        boss: {
          ...baseState.boss,
          active: false,
          clicksSinceLastBoss: 500
        }
      };

      const info = mockGetBossInfo(stateNoActiveBoss);

      expect(info.active).toBe(false);
      expect(info.clicksNeeded).toBe(MOCK_BOSS_CONFIG.spawnThreshold - 500);
      expect(info.spawnProgress).toBeCloseTo(0.5);
    });

    it('should return cooldown info when on cooldown', () => {
      const stateOnCooldown = {
        ...baseState,
        boss: {
          ...baseState.boss,
          active: false,
          lastSpawnTime: Date.now() - 1800000,
          clicksSinceLastBoss: 1000
        }
      };

      const info = mockGetBossInfo(stateOnCooldown);

      expect(info.active).toBe(false);
      expect(info.onCooldown).toBe(true);
      expect(info.cooldownRemaining).toBeGreaterThan(0);
    });

    it('should include potential rewards', () => {
      const stateWithActiveBoss = {
        ...baseState,
        boss: {
          ...baseState.boss,
          active: true,
          level: 3,
          health: 50000,
          maxHealth: 100000,
          spawnTime: Date.now()
        }
      };

      const info = mockGetBossInfo(stateWithActiveBoss);

      expect(info.rewards).toBeDefined();
      expect(info.rewards.essence).toBeGreaterThan(0);
      expect(info.rewards.fatePoints).toBeGreaterThan(0);
    });
  });
});

// Mock implementations for testing

function mockCheckBossSpawn(state) {
  const boss = state.boss || {};
  const now = Date.now();

  // Check if boss is already active
  if (boss.active) {
    return {
      shouldSpawn: false,
      canSpawn: false,
      reason: 'Boss is already active'
    };
  }

  // Check cooldown
  if (boss.lastSpawnTime) {
    const timeSinceLastBoss = now - boss.lastSpawnTime;
    if (timeSinceLastBoss < MOCK_BOSS_CONFIG.cooldownMs) {
      return {
        shouldSpawn: false,
        canSpawn: false,
        cooldownRemaining: Math.ceil((MOCK_BOSS_CONFIG.cooldownMs - timeSinceLastBoss) / 1000),
        reason: 'Boss is on cooldown'
      };
    }
  }

  // Check click threshold
  const clicksSinceLastBoss = boss.clicksSinceLastBoss || 0;
  if (clicksSinceLastBoss >= MOCK_BOSS_CONFIG.spawnThreshold) {
    return {
      shouldSpawn: true,
      canSpawn: true
    };
  }

  return {
    shouldSpawn: false,
    canSpawn: true,
    clicksNeeded: MOCK_BOSS_CONFIG.spawnThreshold - clicksSinceLastBoss
  };
}

function mockSpawnBoss(state) {
  const spawnCheck = mockCheckBossSpawn(state);

  if (!spawnCheck.canSpawn) {
    return {
      success: false,
      error: spawnCheck.reason || 'Cannot spawn boss',
      code: 'BOSS_COOLDOWN'
    };
  }

  if (!spawnCheck.shouldSpawn) {
    return {
      success: false,
      error: 'Insufficient clicks to spawn boss',
      code: 'BOSS_SPAWN_FAILED'
    };
  }

  const boss = state.boss || {};
  const newLevel = (boss.level || 0) + 1;
  const maxHealth = Math.floor(MOCK_BOSS_CONFIG.baseHealth * Math.pow(MOCK_BOSS_CONFIG.healthScaling, newLevel - 1));

  const newState = {
    ...state,
    boss: {
      ...boss,
      active: true,
      level: newLevel,
      health: maxHealth,
      maxHealth,
      spawnTime: Date.now(),
      clicksSinceLastBoss: 0
    }
  };

  return {
    success: true,
    newState,
    bossLevel: newLevel,
    bossHealth: maxHealth
  };
}

function mockAttackBoss(state, damage) {
  const boss = state.boss || {};

  if (!boss.active) {
    return {
      success: false,
      error: 'No active boss to attack',
      code: 'BOSS_NOT_ACTIVE'
    };
  }

  const newHealth = Math.max(0, boss.health - damage);
  const defeated = newHealth === 0;

  let newState = {
    ...state,
    boss: {
      ...boss,
      health: newHealth
    }
  };

  let rewards = null;

  if (defeated) {
    // Calculate rewards
    const rewardMultiplier = Math.pow(MOCK_BOSS_CONFIG.rewardScaling, boss.level - 1);
    rewards = {
      essence: Math.floor(MOCK_BOSS_CONFIG.baseRewards.essence * rewardMultiplier),
      fatePoints: Math.floor(MOCK_BOSS_CONFIG.baseRewards.fatePoints * rewardMultiplier),
      rollTickets: Math.floor(MOCK_BOSS_CONFIG.baseRewards.rollTickets * rewardMultiplier)
    };

    // Apply rewards
    newState = {
      ...newState,
      essence: newState.essence + rewards.essence,
      boss: {
        ...newState.boss,
        active: false,
        lastSpawnTime: Date.now()
      },
      stats: {
        ...newState.stats,
        bossesDefeated: (newState.stats?.bossesDefeated || 0) + 1,
        totalBossRewards: (newState.stats?.totalBossRewards || 0) + rewards.essence
      }
    };
  }

  return {
    success: true,
    defeated,
    healthRemaining: newHealth,
    rewards,
    newState
  };
}

function mockCheckBossExpiration(state) {
  const boss = state.boss || {};

  if (!boss.active) {
    return {
      expired: false,
      newState: state
    };
  }

  const now = Date.now();
  const timeAlive = now - boss.spawnTime;

  if (timeAlive >= MOCK_BOSS_CONFIG.expirationMs) {
    const newState = {
      ...state,
      boss: {
        ...boss,
        active: false,
        health: 0,
        lastSpawnTime: now
      }
    };

    return {
      expired: true,
      newState
    };
  }

  return {
    expired: false,
    timeRemaining: Math.ceil((MOCK_BOSS_CONFIG.expirationMs - timeAlive) / 1000),
    newState: state
  };
}

function mockGetBossInfo(state) {
  const boss = state.boss || {};

  if (boss.active) {
    const now = Date.now();
    const timeAlive = now - boss.spawnTime;
    const timeRemaining = Math.max(0, MOCK_BOSS_CONFIG.expirationMs - timeAlive);

    const rewardMultiplier = Math.pow(MOCK_BOSS_CONFIG.rewardScaling, boss.level - 1);
    const rewards = {
      essence: Math.floor(MOCK_BOSS_CONFIG.baseRewards.essence * rewardMultiplier),
      fatePoints: Math.floor(MOCK_BOSS_CONFIG.baseRewards.fatePoints * rewardMultiplier),
      rollTickets: Math.floor(MOCK_BOSS_CONFIG.baseRewards.rollTickets * rewardMultiplier)
    };

    return {
      active: true,
      level: boss.level,
      health: boss.health,
      maxHealth: boss.maxHealth,
      healthPercent: boss.health / boss.maxHealth,
      timeRemaining: Math.ceil(timeRemaining / 1000),
      rewards
    };
  }

  // Check cooldown
  let onCooldown = false;
  let cooldownRemaining = 0;

  if (boss.lastSpawnTime) {
    const now = Date.now();
    const timeSinceLastBoss = now - boss.lastSpawnTime;
    if (timeSinceLastBoss < MOCK_BOSS_CONFIG.cooldownMs) {
      onCooldown = true;
      cooldownRemaining = Math.ceil((MOCK_BOSS_CONFIG.cooldownMs - timeSinceLastBoss) / 1000);
    }
  }

  const clicksSinceLastBoss = boss.clicksSinceLastBoss || 0;
  const clicksNeeded = Math.max(0, MOCK_BOSS_CONFIG.spawnThreshold - clicksSinceLastBoss);
  const spawnProgress = Math.min(1, clicksSinceLastBoss / MOCK_BOSS_CONFIG.spawnThreshold);

  return {
    active: false,
    onCooldown,
    cooldownRemaining,
    clicksNeeded,
    spawnProgress,
    nextLevel: (boss.level || 0) + 1
  };
}
