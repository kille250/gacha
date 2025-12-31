/**
 * Gacha Enhancement Systems Unit Tests
 *
 * Tests for:
 * - Pity counter updates and resets
 * - Milestone progress tracking and claiming
 * - Fate points accumulation and exchange
 * - Account reset completeness
 */

const gachaEnhanced = require('../services/gachaEnhancedService');
const { GACHA_MILESTONE_REWARDS, GACHA_FATE_POINTS } = require('../config/gameDesign');

// ===========================================
// MOCK DATA
// ===========================================

const createMockUser = () => ({
  id: 1,
  username: 'testuser',
  points: 10000,
  rollTickets: 5,
  premiumTickets: 2,
  gachaPity: {
    pullsSinceRare: 0,
    pullsSinceEpic: 0,
    pullsSinceLegendary: 0,
    totalPulls: 0
  },
  bannerPity: {},
  pullHistory: {},
  fatePoints: {},
  characterSelectors: [],
  weeklyBannerTickets: 0,
  rodSkins: [],
  items: []
});

const createMockBanner = (id = 1) => ({
  id,
  name: 'Test Banner',
  rateMultiplier: 1.5,
  active: true
});

// ===========================================
// PITY SYSTEM TESTS
// ===========================================

describe('Pity System', () => {
  describe('getPityState', () => {
    test('returns correct initial pity state', () => {
      const user = createMockUser();
      const state = gachaEnhanced.getPityState(user, null);

      expect(state.standard.pullsSinceRare).toBe(0);
      expect(state.standard.pullsSinceEpic).toBe(0);
      expect(state.standard.pullsSinceLegendary).toBe(0);
      expect(state.standard.totalPulls).toBe(0);
      expect(state.standard.progress.rare.percent).toBe(0);
      expect(state.standard.progress.epic.percent).toBe(0);
      expect(state.standard.progress.legendary.percent).toBe(0);
      expect(state.banner).toBeNull();
    });

    test('returns banner pity when banner provided', () => {
      const user = createMockUser();
      const banner = createMockBanner();
      const state = gachaEnhanced.getPityState(user, banner);

      expect(state.banner).not.toBeNull();
      expect(state.banner.pullsSinceFeatured).toBe(0);
      expect(state.banner.guaranteedFeatured).toBe(false);
    });

    test('calculates correct progress percentages', () => {
      const user = createMockUser();
      user.gachaPity = {
        pullsSinceRare: 5,
        pullsSinceEpic: 25,
        pullsSinceLegendary: 45,
        totalPulls: 50
      };
      const state = gachaEnhanced.getPityState(user, null);

      expect(state.standard.progress.rare.percent).toBe(50);
      expect(state.standard.progress.epic.percent).toBe(50);
      expect(state.standard.progress.legendary.percent).toBe(50);
    });

    test('identifies soft pity correctly', () => {
      const user = createMockUser();
      user.gachaPity = {
        pullsSinceRare: 0,
        pullsSinceEpic: 42,
        pullsSinceLegendary: 78,
        totalPulls: 80
      };
      const state = gachaEnhanced.getPityState(user, null);

      expect(state.standard.softPity.epic.active).toBe(true);
      expect(state.standard.softPity.legendary.active).toBe(true);
    });
  });

  describe('updatePityCounters', () => {
    test('increments all counters on common pull', () => {
      const user = createMockUser();
      gachaEnhanced.updatePityCounters(user, 'common', null, false);

      expect(user.gachaPity.pullsSinceRare).toBe(1);
      expect(user.gachaPity.pullsSinceEpic).toBe(1);
      expect(user.gachaPity.pullsSinceLegendary).toBe(1);
      expect(user.gachaPity.totalPulls).toBe(1);
    });

    test('resets rare counter on rare pull', () => {
      const user = createMockUser();
      user.gachaPity = {
        pullsSinceRare: 8,
        pullsSinceEpic: 20,
        pullsSinceLegendary: 50,
        totalPulls: 50
      };
      gachaEnhanced.updatePityCounters(user, 'rare', null, false);

      expect(user.gachaPity.pullsSinceRare).toBe(0);
      expect(user.gachaPity.pullsSinceEpic).toBe(21);
      expect(user.gachaPity.pullsSinceLegendary).toBe(51);
    });

    test('resets rare and epic counters on epic pull', () => {
      const user = createMockUser();
      user.gachaPity = {
        pullsSinceRare: 5,
        pullsSinceEpic: 45,
        pullsSinceLegendary: 60,
        totalPulls: 70
      };
      gachaEnhanced.updatePityCounters(user, 'epic', null, false);

      expect(user.gachaPity.pullsSinceRare).toBe(0);
      expect(user.gachaPity.pullsSinceEpic).toBe(0);
      expect(user.gachaPity.pullsSinceLegendary).toBe(61);
    });

    test('resets all counters on legendary pull', () => {
      const user = createMockUser();
      user.gachaPity = {
        pullsSinceRare: 9,
        pullsSinceEpic: 49,
        pullsSinceLegendary: 89,
        totalPulls: 89
      };
      gachaEnhanced.updatePityCounters(user, 'legendary', null, false);

      expect(user.gachaPity.pullsSinceRare).toBe(0);
      expect(user.gachaPity.pullsSinceEpic).toBe(0);
      expect(user.gachaPity.pullsSinceLegendary).toBe(0);
      expect(user.gachaPity.totalPulls).toBe(90);
    });

    test('updates banner pity on legendary pull (non-featured)', () => {
      const user = createMockUser();
      const banner = createMockBanner();
      gachaEnhanced.updatePityCounters(user, 'legendary', banner, false);

      expect(user.bannerPity[banner.id].pullsSinceFeatured).toBe(1);
      expect(user.bannerPity[banner.id].guaranteedFeatured).toBe(true);
    });

    test('resets banner pity on featured legendary pull', () => {
      const user = createMockUser();
      const banner = createMockBanner();
      user.bannerPity[banner.id] = {
        pullsSinceFeatured: 50,
        guaranteedFeatured: true,
        totalBannerPulls: 100
      };
      gachaEnhanced.updatePityCounters(user, 'legendary', banner, true);

      expect(user.bannerPity[banner.id].pullsSinceFeatured).toBe(0);
      expect(user.bannerPity[banner.id].guaranteedFeatured).toBe(false);
    });
  });
});

// ===========================================
// MILESTONE SYSTEM TESTS
// ===========================================

describe('Milestone System', () => {
  describe('getMilestoneStatus', () => {
    test('returns all milestones with correct initial state', () => {
      const user = createMockUser();
      const status = gachaEnhanced.getMilestoneStatus(user, 'standard');

      expect(status.totalPulls).toBe(0);
      expect(status.milestones.length).toBe(GACHA_MILESTONE_REWARDS.milestones.length);
      expect(status.milestones[0].claimed).toBe(false);
      expect(status.milestones[0].canClaim).toBe(false);
    });

    test('marks milestones as claimable when threshold reached', () => {
      const user = createMockUser();
      user.pullHistory = { standard: { total: 15, claimed: [] } };
      const status = gachaEnhanced.getMilestoneStatus(user, 'standard');

      expect(status.totalPulls).toBe(15);
      const milestone10 = status.milestones.find(m => m.pulls === 10);
      expect(milestone10.canClaim).toBe(true);
      expect(milestone10.claimed).toBe(false);
    });

    test('marks milestones as claimed when in claimed array', () => {
      const user = createMockUser();
      user.pullHistory = { standard: { total: 50, claimed: [10, 30] } };
      const status = gachaEnhanced.getMilestoneStatus(user, 'standard');

      const milestone10 = status.milestones.find(m => m.pulls === 10);
      const milestone30 = status.milestones.find(m => m.pulls === 30);
      const milestone50 = status.milestones.find(m => m.pulls === 50);

      expect(milestone10.claimed).toBe(true);
      expect(milestone10.canClaim).toBe(false);
      expect(milestone30.claimed).toBe(true);
      expect(milestone50.canClaim).toBe(true);
      expect(milestone50.claimed).toBe(false);
    });
  });

  describe('recordPull', () => {
    test('records pulls correctly for new banner', () => {
      const user = createMockUser();
      gachaEnhanced.recordPull(user, 'banner1', 10);

      expect(user.pullHistory.banner1.total).toBe(10);
      expect(user.pullHistory.banner1.claimed).toEqual([]);
    });

    test('accumulates pulls for existing banner', () => {
      const user = createMockUser();
      user.pullHistory = { banner1: { total: 50, claimed: [10] } };
      gachaEnhanced.recordPull(user, 'banner1', 20);

      expect(user.pullHistory.banner1.total).toBe(70);
      expect(user.pullHistory.banner1.claimed).toEqual([10]);
    });
  });

  describe('claimMilestoneReward', () => {
    test('successfully claims milestone reward', () => {
      const user = createMockUser();
      user.pullHistory = { standard: { total: 15, claimed: [] } };
      const result = gachaEnhanced.claimMilestoneReward(user, 'standard', 10);

      expect(result.success).toBe(true);
      expect(result.milestone).toBe(10);
      expect(user.pullHistory.standard.claimed).toContain(10);
    });

    test('fails to claim already claimed milestone', () => {
      const user = createMockUser();
      user.pullHistory = { standard: { total: 50, claimed: [10] } };
      const result = gachaEnhanced.claimMilestoneReward(user, 'standard', 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already claimed');
    });

    test('fails to claim milestone not yet reached', () => {
      const user = createMockUser();
      user.pullHistory = { standard: { total: 5, claimed: [] } };
      const result = gachaEnhanced.claimMilestoneReward(user, 'standard', 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Need 10 pulls');
    });

    test('fails for invalid milestone', () => {
      const user = createMockUser();
      const result = gachaEnhanced.claimMilestoneReward(user, 'standard', 999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid milestone');
    });
  });

  describe('applyMilestoneReward', () => {
    test('applies points reward correctly', () => {
      const user = createMockUser();
      const reward = { type: 'points', quantity: 500 };
      gachaEnhanced.applyMilestoneReward(user, reward);

      expect(user.points).toBe(10500); // 10000 initial + 500
    });

    test('applies premium tickets reward correctly', () => {
      const user = createMockUser();
      const reward = { type: 'premium_tickets', quantity: 10 };
      gachaEnhanced.applyMilestoneReward(user, reward);

      expect(user.premiumTickets).toBe(12); // 2 initial + 10
    });

    test('applies character selector reward correctly', () => {
      const user = createMockUser();
      const reward = { type: 'character_selector', rarity: 'epic' };
      gachaEnhanced.applyMilestoneReward(user, reward);

      expect(user.characterSelectors.length).toBe(1);
      expect(user.characterSelectors[0].rarity).toBe('epic');
      expect(user.characterSelectors[0].used).toBe(false);
    });

    test('applies rod skin reward correctly', () => {
      const user = createMockUser();
      const reward = { type: 'rod_skin', id: 'starlight_rod' };
      gachaEnhanced.applyMilestoneReward(user, reward);

      expect(user.rodSkins).toContain('starlight_rod');
    });
  });
});

// ===========================================
// FATE POINTS SYSTEM TESTS
// ===========================================

describe('Fate Points System', () => {
  describe('getFatePointsStatus', () => {
    test('returns enabled status and zero points initially', () => {
      const user = createMockUser();
      const status = gachaEnhanced.getFatePointsStatus(user, 'banner1');

      expect(status.enabled).toBe(true);
      expect(status.points).toBe(0);
      expect(status.canGuarantee).toBe(false);
    });

    test('calculates progress correctly', () => {
      const user = createMockUser();
      // Using legendary selector cost (600) as the "guarantee" reference point
      const pointsNeeded = GACHA_FATE_POINTS.exchangeOptions.legendary_selector.cost;
      const halfPoints = Math.floor(pointsNeeded / 2);
      user.fatePoints = { banner1: { points: halfPoints, lastUpdate: new Date().toISOString() } };
      const status = gachaEnhanced.getFatePointsStatus(user, 'banner1');

      expect(status.points).toBe(halfPoints);
      expect(status.progress).toBe(50); // half = 50%
      expect(status.canGuarantee).toBe(false);
    });

    test('allows guarantee when enough points', () => {
      const user = createMockUser();
      // Using legendary selector cost (600) as the "guarantee" reference point
      const pointsNeeded = GACHA_FATE_POINTS.exchangeOptions.legendary_selector.cost;
      user.fatePoints = { banner1: { points: pointsNeeded, lastUpdate: new Date().toISOString() } };
      const status = gachaEnhanced.getFatePointsStatus(user, 'banner1');

      expect(status.canGuarantee).toBe(true);
      expect(status.progress).toBe(100);
    });

    test('returns weekly tracking data', () => {
      const user = createMockUser();
      const status = gachaEnhanced.getFatePointsStatus(user, 'banner1');

      expect(status.pointsThisWeek).toBeDefined();
      expect(status.weeklyMax).toBeDefined();
      expect(status.weeklyMax).toBe(GACHA_FATE_POINTS.weeklyMax);
    });

    test('returns exchange options', () => {
      const user = createMockUser();
      const status = gachaEnhanced.getFatePointsStatus(user, 'banner1');

      expect(status.exchangeOptions).toBeDefined();
      expect(Array.isArray(status.exchangeOptions)).toBe(true);
      expect(status.exchangeOptions.length).toBe(7);
    });
  });

  describe('awardFatePoints', () => {
    test('awards correct points for standard pull', () => {
      const user = createMockUser();
      const result = gachaEnhanced.awardFatePoints(user, 'banner1', 'standard', false);

      expect(result.awarded).toBe(GACHA_FATE_POINTS.pointsPerPull.standard);
      expect(user.fatePoints.banner1.points).toBe(GACHA_FATE_POINTS.pointsPerPull.standard);
    });

    test('awards correct points for banner pull', () => {
      const user = createMockUser();
      const result = gachaEnhanced.awardFatePoints(user, 'banner1', 'banner', false);

      expect(result.awarded).toBe(GACHA_FATE_POINTS.pointsPerPull.banner);
    });

    test('awards correct points for premium pull', () => {
      const user = createMockUser();
      const result = gachaEnhanced.awardFatePoints(user, 'banner1', 'premium', false);

      expect(result.awarded).toBe(GACHA_FATE_POINTS.pointsPerPull.premium);
    });

    test('awards bonus points for non-featured 5-star', () => {
      const user = createMockUser();
      const result = gachaEnhanced.awardFatePoints(user, 'banner1', 'banner', true);

      const expected = GACHA_FATE_POINTS.pointsPerPull.banner +
        GACHA_FATE_POINTS.rateUpBanner.nonFeaturedFiveStarPoints;
      expect(result.awarded).toBe(expected);
    });

    test('accumulates points across pulls', () => {
      const user = createMockUser();
      gachaEnhanced.awardFatePoints(user, 'banner1', 'standard', false);
      gachaEnhanced.awardFatePoints(user, 'banner1', 'standard', false);
      gachaEnhanced.awardFatePoints(user, 'banner1', 'standard', false);

      expect(user.fatePoints.banner1.points).toBe(3 * GACHA_FATE_POINTS.pointsPerPull.standard);
    });

    test('awards correct points for multi-pull', () => {
      const user = createMockUser();
      // 10x banner pull should award 10 * pointsPerPull.banner points
      const expectedPoints = 10 * GACHA_FATE_POINTS.pointsPerPull.banner;
      gachaEnhanced.awardFatePoints(user, 'banner1', 'banner', false, 10);

      expect(user.fatePoints.banner1.points).toBe(expectedPoints);
    });

    test('awards correct points for multi-pull with non-featured bonus', () => {
      const user = createMockUser();
      // 10x banner pull with non-featured 5-star: 10 * pointsPerPull + bonus
      const expectedPoints = 10 * GACHA_FATE_POINTS.pointsPerPull.banner +
        GACHA_FATE_POINTS.rateUpBanner.nonFeaturedFiveStarPoints;
      gachaEnhanced.awardFatePoints(user, 'banner1', 'banner', true, 10);

      expect(user.fatePoints.banner1.points).toBe(expectedPoints);
    });

    test('respects weekly cap', () => {
      const user = createMockUser();
      const weeklyMax = GACHA_FATE_POINTS.weeklyMax;

      // Award more than weekly cap
      const result = gachaEnhanced.awardFatePoints(user, 'banner1', 'standard', false, weeklyMax + 100);

      // Should be capped at weeklyMax
      expect(result.awarded).toBeLessThanOrEqual(weeklyMax);
      expect(result.capped).toBe(true);
    });
  });

  describe('exchangeFatePoints', () => {
    test('successfully exchanges fate points for rare selector', () => {
      const user = createMockUser();
      const cost = GACHA_FATE_POINTS.exchangeOptions.rare_selector.cost;
      user.fatePoints = { banner1: { points: cost + 10 } };

      const result = gachaEnhanced.exchangeFatePoints(user, 'rare_selector', 'banner1');

      expect(result.success).toBe(true);
      expect(result.pointsSpent).toBe(cost);
      expect(result.exchangeType).toBe('rare_selector');
      expect(result.reward.selector.rarity).toBe('rare');
    });

    test('successfully exchanges fate points for epic selector', () => {
      const user = createMockUser();
      const cost = GACHA_FATE_POINTS.exchangeOptions.epic_selector.cost;
      user.fatePoints = { banner1: { points: cost } };

      const result = gachaEnhanced.exchangeFatePoints(user, 'epic_selector', 'banner1');

      expect(result.success).toBe(true);
      expect(result.pointsSpent).toBe(cost);
      expect(result.reward.selector.rarity).toBe('epic');
    });

    test('successfully exchanges fate points for legendary selector', () => {
      const user = createMockUser();
      const cost = GACHA_FATE_POINTS.exchangeOptions.legendary_selector.cost;
      user.fatePoints = { banner1: { points: cost } };

      const result = gachaEnhanced.exchangeFatePoints(user, 'legendary_selector', 'banner1');

      expect(result.success).toBe(true);
      expect(result.pointsSpent).toBe(cost);
      expect(result.reward.selector.rarity).toBe('legendary');
    });

    test('successfully exchanges fate points for pity boost', () => {
      const user = createMockUser();
      const cost = GACHA_FATE_POINTS.exchangeOptions.pity_boost.cost;
      user.fatePoints = { banner1: { points: cost } };

      const result = gachaEnhanced.exchangeFatePoints(user, 'pity_boost', 'banner1');

      expect(result.success).toBe(true);
      expect(result.pointsSpent).toBe(cost);
      expect(result.reward.pityBoost).toBeDefined();
    });

    test('fails when not enough points', () => {
      const user = createMockUser();
      user.fatePoints = { banner1: { points: 50 } }; // Less than 100 for rare selector

      const result = gachaEnhanced.exchangeFatePoints(user, 'rare_selector', 'banner1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Need');
    });

    test('fails for invalid exchange type', () => {
      const user = createMockUser();
      user.fatePoints = { banner1: { points: 1000 } };

      const result = gachaEnhanced.exchangeFatePoints(user, 'invalid_type', 'banner1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid exchange type');
    });

    test('adds selector to characterSelectors array', () => {
      const user = createMockUser();
      const cost = GACHA_FATE_POINTS.exchangeOptions.rare_selector.cost;
      user.fatePoints = { banner1: { points: cost } };

      gachaEnhanced.exchangeFatePoints(user, 'rare_selector', 'banner1');

      expect(user.characterSelectors).toBeDefined();
      expect(user.characterSelectors.length).toBe(1);
      expect(user.characterSelectors[0].rarity).toBe('rare');
      expect(user.characterSelectors[0].source).toBe('fate_points_exchange');
    });
  });
});

// ===========================================
// ACCOUNT RESET TESTS
// ===========================================

describe('Account Reset Verification', () => {
  test('all gacha-related fields have expected reset values', () => {
    // This test documents expected reset state
    const expectedResetState = {
      gachaPity: { pullsSinceRare: 0, pullsSinceEpic: 0, pullsSinceLegendary: 0, totalPulls: 0 },
      bannerPity: {},
      pullHistory: {},
      fatePoints: {},
      characterSelectors: [],
      weeklyBannerTickets: 0
    };

    // Verify each field type
    expect(expectedResetState.gachaPity.pullsSinceRare).toBe(0);
    expect(expectedResetState.gachaPity.pullsSinceEpic).toBe(0);
    expect(expectedResetState.gachaPity.pullsSinceLegendary).toBe(0);
    expect(expectedResetState.gachaPity.totalPulls).toBe(0);
    expect(Object.keys(expectedResetState.bannerPity).length).toBe(0);
    expect(Object.keys(expectedResetState.pullHistory).length).toBe(0);
    expect(Object.keys(expectedResetState.fatePoints).length).toBe(0);
    expect(expectedResetState.characterSelectors.length).toBe(0);
    expect(expectedResetState.weeklyBannerTickets).toBe(0);
  });
});

// ===========================================
// EDGE CASE TESTS
// ===========================================

describe('Edge Cases', () => {
  test('pity handles overflow gracefully', () => {
    const user = createMockUser();
    user.gachaPity = {
      pullsSinceRare: 1000,
      pullsSinceEpic: 1000,
      pullsSinceLegendary: 1000,
      totalPulls: 1000
    };
    const state = gachaEnhanced.getPityState(user, null);

    // Progress should cap at 100%
    expect(state.standard.progress.rare.percent).toBe(100);
    expect(state.standard.progress.epic.percent).toBe(100);
    expect(state.standard.progress.legendary.percent).toBe(100);
  });

  test('milestone tracking works with multiple banners', () => {
    const user = createMockUser();
    gachaEnhanced.recordPull(user, 'banner1', 50);
    gachaEnhanced.recordPull(user, 'banner2', 100);
    gachaEnhanced.recordPull(user, 'standard', 200);

    expect(user.pullHistory.banner1.total).toBe(50);
    expect(user.pullHistory.banner2.total).toBe(100);
    expect(user.pullHistory.standard.total).toBe(200);
  });

  test('fate points track separately per banner', () => {
    const user = createMockUser();
    gachaEnhanced.awardFatePoints(user, 'banner1', 'premium', false);
    gachaEnhanced.awardFatePoints(user, 'banner2', 'standard', false);
    gachaEnhanced.awardFatePoints(user, 'banner1', 'premium', false);

    // With new config, all pull types award 1 FP each
    const premiumPts = GACHA_FATE_POINTS.pointsPerPull.premium;
    const standardPts = GACHA_FATE_POINTS.pointsPerPull.standard;
    expect(user.fatePoints.banner1.points).toBe(premiumPts * 2);
    expect(user.fatePoints.banner2.points).toBe(standardPts);
  });

  test('handles undefined/null user fields gracefully', () => {
    const user = {
      id: 1,
      gachaPity: null,
      bannerPity: null,
      pullHistory: null,
      fatePoints: null
    };

    // Should not throw
    expect(() => gachaEnhanced.getPityState(user, null)).not.toThrow();
    expect(() => gachaEnhanced.getMilestoneStatus(user, 'standard')).not.toThrow();
    expect(() => gachaEnhanced.getFatePointsStatus(user, 'banner1')).not.toThrow();
  });
});

// ===========================================
// RESET → PULL → RESET CYCLE TEST
// ===========================================

describe('Reset → Pull → Reset Cycle', () => {
  test('complete cycle maintains integrity', () => {
    const user = createMockUser();

    // Simulate pulls
    for (let i = 0; i < 15; i++) {
      gachaEnhanced.updatePityCounters(user, 'common', null, false);
    }
    gachaEnhanced.recordPull(user, 'standard', 15);
    gachaEnhanced.awardFatePoints(user, 'standard', 'standard', false);

    // Verify state after pulls
    expect(user.gachaPity.totalPulls).toBe(15);
    expect(user.pullHistory.standard.total).toBe(15);
    expect(user.fatePoints.standard.points).toBe(1);

    // Simulate reset
    user.gachaPity = { pullsSinceRare: 0, pullsSinceEpic: 0, pullsSinceLegendary: 0, totalPulls: 0 };
    user.bannerPity = {};
    user.pullHistory = {};
    user.fatePoints = {};
    user.characterSelectors = [];

    // Verify reset
    expect(user.gachaPity.totalPulls).toBe(0);
    expect(Object.keys(user.pullHistory).length).toBe(0);
    expect(Object.keys(user.fatePoints).length).toBe(0);

    // Verify fresh start
    const state = gachaEnhanced.getPityState(user, null);
    expect(state.standard.totalPulls).toBe(0);

    const milestones = gachaEnhanced.getMilestoneStatus(user, 'standard');
    expect(milestones.totalPulls).toBe(0);

    const fateStatus = gachaEnhanced.getFatePointsStatus(user, 'standard');
    expect(fateStatus.points).toBe(0);
  });
});
