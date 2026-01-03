/**
 * Essence Tap Frontend Configuration
 *
 * This file contains frontend constants that should stay in sync with
 * the backend config (backend/config/essenceTap.js) and the shared
 * constants file (shared/balanceConstants.js ESSENCE_TAP_DISPLAY).
 *
 * These values are used for optimistic UI updates before server validation.
 * The actual authoritative values come from the backend via /essence-tap/config.
 *
 * SYNCHRONIZATION PATTERN:
 * - Backend is the SOURCE OF TRUTH for all essence calculations
 * - Frontend uses these values for optimistic UI predictions only
 * - On every sync/save, frontend reconciles with backend values
 * - See useEssenceTap.js auto-save effect for reconciliation logic
 *
 * v3.0 REBALANCING UPDATE:
 * - Extended progression from ~2-4 hours to ~2-4 weeks
 * - See docs/ESSENCE_TAP_BALANCE_ANALYSIS.md for full details
 */

// ===========================================
// COMBO SYSTEM CONSTANTS
// ===========================================

/**
 * Combo mechanics - synced with backend/config/essenceTap.js GAME_CONFIG
 */
export const COMBO_CONFIG = {
  // Time before combo resets (ms) - increased for mobile friendliness
  decayTime: 1500,
  // Maximum combo multiplier
  maxMultiplier: 2.5,
  // Multiplier increase per click
  growthRate: 0.08
};

// ===========================================
// CLICK MECHANICS
// ===========================================

export const CLICK_CONFIG = {
  baseClickPower: 1,
  baseCritChance: 0.01,
  baseCritMultiplier: 10,
  maxClicksPerSecond: 20
};

// ===========================================
// GOLDEN ESSENCE
// ===========================================

export const GOLDEN_CONFIG = {
  chance: 0.001,      // 0.1% chance per click
  multiplier: 100     // 100x the normal click value
};

// ===========================================
// CHARACTER BONUSES
// ===========================================

export const CHARACTER_BONUSES = {
  common: 0.05,      // +5%
  uncommon: 0.10,    // +10%
  rare: 0.20,        // +20%
  epic: 0.35,        // +35%
  legendary: 0.50    // +50%
};

export const UNDERDOG_BONUSES = {
  common: 0.15,      // +15% extra when using common characters
  uncommon: 0.10     // +10% extra when using uncommon characters
};

// ===========================================
// ELEMENT ABILITIES
// ===========================================

export const CHARACTER_ABILITIES = {
  fire: {
    id: 'fire',
    name: 'Flame Fury',
    description: '+10% crit chance per Fire character',
    type: 'crit_chance',
    bonusPerCharacter: 0.10,
    color: '#EF4444',
    icon: 'flame'
  },
  water: {
    id: 'water',
    name: 'Flow State',
    description: '+15% generator production per Water character',
    type: 'production',
    bonusPerCharacter: 0.15,
    color: '#3B82F6',
    icon: 'water'
  },
  earth: {
    id: 'earth',
    name: 'Steady Ground',
    description: '+20% offline efficiency per Earth character',
    type: 'offline',
    bonusPerCharacter: 0.20,
    color: '#84CC16',
    icon: 'earth'
  },
  air: {
    id: 'air',
    name: 'Swift Strikes',
    description: '+500ms combo decay time per Air character',
    type: 'combo_duration',
    bonusPerCharacter: 500,
    color: '#06B6D4',
    icon: 'air'
  },
  light: {
    id: 'light',
    name: 'Golden Touch',
    description: '+0.05% golden essence chance per Light character',
    type: 'golden_chance',
    bonusPerCharacter: 0.0005,
    color: '#FCD34D',
    icon: 'light'
  },
  dark: {
    id: 'dark',
    name: 'Shadow Power',
    description: '+20% click power per Dark character',
    type: 'click_power',
    bonusPerCharacter: 0.20,
    color: '#6366F1',
    icon: 'dark'
  },
  neutral: {
    id: 'neutral',
    name: 'Balance',
    description: '+5% to all stats per Neutral character',
    type: 'all_stats',
    bonusPerCharacter: 0.05,
    color: '#9CA3AF',
    icon: 'neutral'
  }
};

// ===========================================
// SERIES SYNERGIES
// ===========================================

export const SERIES_SYNERGIES = {
  matchBonuses: {
    2: 0.10,   // 2 from same series: +10%
    3: 0.25,   // 3 from same series: +25%
    4: 0.45,   // 4 from same series: +45%
    5: 0.70    // Full team same series: +70%
  },
  maxSynergyBonus: 1.00,
  diversityBonus: 0.15,
  diversityThreshold: 5
};

// ===========================================
// ELEMENT SYNERGIES
// ===========================================

export const ELEMENT_SYNERGIES = {
  pairBonus: 0.05,
  fullTeamBonus: 0.25,
  diversityBonus: 0.10
};

// ===========================================
// DAILY MODIFIERS
// ===========================================

export const DAILY_MODIFIERS = {
  0: { // Sunday
    id: 'golden_sunday',
    name: 'Golden Sunday',
    description: '5x Golden Essence chance!',
    color: '#F59E0B',
    effects: { goldenChanceMultiplier: 5 }
  },
  1: { // Monday
    id: 'momentum_monday',
    name: 'Momentum Monday',
    description: '2x combo growth rate!',
    color: '#3B82F6',
    effects: { comboGrowthMultiplier: 2 }
  },
  2: { // Tuesday
    id: 'tap_tuesday',
    name: 'Tap Tuesday',
    description: '+50% click power!',
    color: '#EF4444',
    effects: { clickPowerBonus: 0.5 }
  },
  3: { // Wednesday
    id: 'wealth_wednesday',
    name: 'Wealth Wednesday',
    description: '+25% generator output!',
    color: '#10B981',
    effects: { generatorOutputBonus: 0.25 }
  },
  4: { // Thursday
    id: 'critical_thursday',
    name: 'Critical Thursday',
    description: '2x crit multiplier!',
    color: '#F59E0B',
    effects: { critMultiplierBonus: 2 }
  },
  5: { // Friday
    id: 'fortune_friday',
    name: 'Fortune Friday',
    description: '+15% crit chance!',
    color: '#8B5CF6',
    effects: { critChanceBonus: 0.15 }
  },
  6: { // Saturday
    id: 'super_saturday',
    name: 'Super Saturday',
    description: '+50% ALL production!',
    color: '#EC4899',
    effects: { allProductionBonus: 0.5 }
  }
};

// ===========================================
// ACTIVE ABILITIES
// ===========================================

export const ACTIVE_ABILITIES = [
  {
    id: 'essence_storm',
    name: 'Essence Storm',
    description: '10x production for 5 seconds',
    duration: 5000,
    cooldown: 60000,
    unlockPrestige: 0,
    color: '#A855F7',
    effects: { productionMultiplier: 10 }
  },
  {
    id: 'critical_focus',
    name: 'Critical Focus',
    description: 'Guaranteed crits for 3 seconds',
    duration: 3000,
    cooldown: 45000,
    unlockPrestige: 1,
    color: '#F59E0B',
    effects: { guaranteedCrits: true }
  },
  {
    id: 'golden_rush',
    name: 'Golden Rush',
    description: '50x golden chance for 10 seconds',
    duration: 10000,
    cooldown: 120000,
    unlockPrestige: 3,
    color: '#FFD700',
    effects: { goldenChanceMultiplier: 50 }
  },
  {
    id: 'time_warp',
    name: 'Time Warp',
    description: 'Collect 30 minutes of offline progress instantly',
    duration: 0,
    cooldown: 300000,
    unlockPrestige: 5,
    color: '#3B82F6',
    effects: { offlineMinutes: 30 }
  }
];

// ===========================================
// BOSS ENCOUNTER CONFIG
// ===========================================

/**
 * Boss configuration - MUST be synced with shared/balanceConstants.js ESSENCE_TAP_DISPLAY.boss
 * The backend uses the shared constants as the single source of truth.
 * Frontend adds visual properties (color) for UI rendering.
 *
 * IMPORTANT: When updating boss values, update shared/balanceConstants.js first!
 */
export const BOSS_CONFIG = {
  tiers: [
    {
      id: 'essence_drake',
      name: 'Essence Drake',
      tier: 1,
      baseHealth: 10000,       // Synced with shared/balanceConstants.js
      timeLimit: 30000,        // Synced with shared/balanceConstants.js
      elementWeakness: 'fire',
      color: '#EF4444',        // Frontend-only visual property
      rewards: {
        essence: 50000,
        fatePoints: 5,
        rollTickets: 1,
        xp: 25
      }
    },
    {
      id: 'void_serpent',
      name: 'Void Serpent',
      tier: 2,
      baseHealth: 50000,       // Synced with shared/balanceConstants.js
      timeLimit: 45000,        // Synced with shared/balanceConstants.js
      elementWeakness: 'light',
      color: '#8B5CF6',        // Frontend-only visual property
      rewards: {
        essence: 250000,
        fatePoints: 10,
        rollTickets: 2,        // Fixed: was 3, now matches backend (2)
        xp: 50
      }
    },
    {
      id: 'arcane_titan',
      name: 'Arcane Titan',
      tier: 3,
      baseHealth: 200000,      // Fixed: was 250000, now matches backend (200000)
      timeLimit: 60000,        // Synced with shared/balanceConstants.js
      elementWeakness: 'dark',
      color: '#3B82F6',        // Frontend-only visual property
      rewards: {
        essence: 1000000,
        fatePoints: 20,        // Fixed: was 25, now matches backend (20)
        rollTickets: 5,
        xp: 100
      }
    },
    {
      id: 'prismatic_dragon',
      name: 'Prismatic Dragon',
      tier: 4,
      baseHealth: 1000000,     // Synced with shared/balanceConstants.js
      timeLimit: 90000,        // Synced with shared/balanceConstants.js
      elementWeakness: null,
      color: '#F59E0B',        // Frontend-only visual property
      rewards: {
        essence: 5000000,
        fatePoints: 50,
        rollTickets: 10,
        prismaticEssence: 50,  // Added: missing from frontend, exists in backend
        xp: 250                // Fixed: was 200, now matches backend (250)
      }
    }
  ],
  // Spawn requirements - synced with shared/balanceConstants.js ESSENCE_TAP_DISPLAY.boss
  spawnRequirement: {
    clicksPerSpawn: 500,       // Synced with shared/balanceConstants.js
    cooldownMs: 300000         // Fixed: was 3600000 (1hr), now matches backend (5min)
  },
  weaknessDamageMultiplier: 2.0 // Synced with shared/balanceConstants.js
};

// ===========================================
// ESSENCE TYPES
// ===========================================

export const ESSENCE_TYPES = {
  pure: {
    id: 'pure',
    name: 'Pure Essence',
    description: 'Generated from clicks only',
    color: '#A855F7'
  },
  ambient: {
    id: 'ambient',
    name: 'Ambient Essence',
    description: 'Generated passively from generators',
    color: '#3B82F6'
  },
  golden: {
    id: 'golden',
    name: 'Golden Essence',
    description: 'Rare essence from golden events',
    color: '#F59E0B'
  },
  prismatic: {
    id: 'prismatic',
    name: 'Prismatic Essence',
    description: 'Ultra-rare essence from special events',
    color: '#EC4899'
  }
};

// ===========================================
// ACHIEVEMENT DEFINITIONS
// ===========================================

export const ACHIEVEMENTS = {
  firstClick: {
    id: 'first_click',
    name: 'First Steps',
    description: 'Click for the first time',
    icon: 'tap',
    category: 'basics'
  },
  thousandClicks: {
    id: 'thousand_clicks',
    name: 'Dedicated Tapper',
    description: 'Click 1,000 times',
    icon: 'tap',
    category: 'clicks'
  },
  tenThousandClicks: {
    id: 'ten_thousand_clicks',
    name: 'Tireless Tapper',
    description: 'Click 10,000 times',
    icon: 'tap',
    category: 'clicks'
  },
  firstGenerator: {
    id: 'first_generator',
    name: 'Automation Begins',
    description: 'Purchase your first generator',
    icon: 'generator',
    category: 'generators'
  },
  tenGenerators: {
    id: 'ten_generators',
    name: 'Factory Floor',
    description: 'Own 10 generators',
    icon: 'generator',
    category: 'generators'
  },
  firstPrestige: {
    id: 'first_prestige',
    name: 'Awakened',
    description: 'Prestige for the first time',
    icon: 'prestige',
    category: 'prestige'
  },
  tenPrestige: {
    id: 'ten_prestige',
    name: 'Enlightened',
    description: 'Prestige 10 times',
    icon: 'prestige',
    category: 'prestige'
  },
  firstGolden: {
    id: 'first_golden',
    name: 'Golden Touch',
    description: 'Get a golden essence click',
    icon: 'golden',
    category: 'luck'
  },
  hundredGolden: {
    id: 'hundred_golden',
    name: 'Midas',
    description: 'Get 100 golden essence clicks',
    icon: 'golden',
    category: 'luck'
  },
  firstBoss: {
    id: 'first_boss',
    name: 'Dragon Slayer',
    description: 'Defeat your first boss',
    icon: 'boss',
    category: 'combat'
  },
  allBosses: {
    id: 'all_bosses',
    name: 'Champion',
    description: 'Defeat all boss tiers',
    icon: 'boss',
    category: 'combat'
  },
  fullTeam: {
    id: 'full_team',
    name: 'Full Squad',
    description: 'Assign 5 characters',
    icon: 'team',
    category: 'characters'
  },
  maxMastery: {
    id: 'max_mastery',
    name: 'Master Trainer',
    description: 'Max mastery on a character',
    icon: 'mastery',
    category: 'characters'
  },
  jackpotWin: {
    id: 'jackpot_win',
    name: 'Jackpot!',
    description: 'Win the progressive jackpot',
    icon: 'jackpot',
    category: 'luck'
  },
  weeklyChampion: {
    id: 'weekly_champion',
    name: 'Weekly Champion',
    description: 'Reach Champion tier in weekly tournament',
    icon: 'trophy',
    category: 'competitive'
  },
  comboMaster: {
    id: 'combo_master',
    name: 'Combo Master',
    description: 'Reach 100 click combo',
    icon: 'combo',
    category: 'skill'
  },
  critStreak: {
    id: 'crit_streak',
    name: 'Lucky Streak',
    description: '10 critical hits in a row',
    icon: 'crit',
    category: 'luck'
  }
};

// ===========================================
// SOUND EFFECT DEFINITIONS
// ===========================================

export const SOUND_EFFECTS = {
  click: {
    id: 'click',
    volume: 0.3,
    variations: 3
  },
  crit: {
    id: 'crit',
    volume: 0.5,
    variations: 2
  },
  golden: {
    id: 'golden',
    volume: 0.6,
    variations: 1
  },
  levelUp: {
    id: 'level_up',
    volume: 0.7,
    variations: 1
  },
  prestige: {
    id: 'prestige',
    volume: 0.8,
    variations: 1
  },
  purchase: {
    id: 'purchase',
    volume: 0.4,
    variations: 2
  },
  milestone: {
    id: 'milestone',
    volume: 0.6,
    variations: 1
  },
  abilityActivate: {
    id: 'ability_activate',
    volume: 0.5,
    variations: 1
  },
  bossHit: {
    id: 'boss_hit',
    volume: 0.4,
    variations: 3
  },
  bossDefeat: {
    id: 'boss_defeat',
    volume: 0.8,
    variations: 1
  },
  jackpot: {
    id: 'jackpot',
    volume: 1.0,
    variations: 1
  }
};

// ===========================================
// UI TIMING CONSTANTS
// ===========================================

export const UI_TIMING = {
  autoSaveInterval: 30000,      // 30 seconds
  passiveTickRate: 100,         // 100ms between passive ticks
  floatingNumberDuration: 600,  // 600ms for floating numbers
  comboIndicatorDelay: 100,     // 100ms delay before showing combo
  particleFadeTime: 500,        // 500ms for particle fade
  abilityFlashDuration: 200,    // 200ms ability activation flash
  achievementDisplayTime: 3000  // 3 seconds to show achievement
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get the current daily modifier based on day of week
 */
export function getCurrentDailyModifier() {
  const day = new Date().getDay();
  return DAILY_MODIFIERS[day];
}

/**
 * Calculate total character bonus from assigned characters
 */
export function calculateCharacterBonus(assignedCharacters) {
  if (!assignedCharacters || assignedCharacters.length === 0) return 0;

  let bonus = 0;
  assignedCharacters.forEach(char => {
    const rarity = char.rarity?.toLowerCase() || 'common';
    bonus += CHARACTER_BONUSES[rarity] || 0.05;

    // Add underdog bonus
    if (UNDERDOG_BONUSES[rarity]) {
      bonus += UNDERDOG_BONUSES[rarity];
    }
  });

  return bonus;
}

/**
 * Calculate element ability bonuses
 */
export function calculateElementBonuses(assignedCharacters) {
  const bonuses = {
    critChance: 0,
    production: 0,
    offline: 0,
    comboDuration: 0,
    goldenChance: 0,
    clickPower: 0,
    allStats: 0
  };

  if (!assignedCharacters || assignedCharacters.length === 0) return bonuses;

  const elementCounts = {};
  assignedCharacters.forEach(char => {
    const element = (char.element || 'neutral').toLowerCase();
    elementCounts[element] = (elementCounts[element] || 0) + 1;
  });

  Object.entries(elementCounts).forEach(([element, count]) => {
    const ability = CHARACTER_ABILITIES[element];
    if (!ability) return;

    const totalBonus = ability.bonusPerCharacter * count;

    switch (ability.type) {
      case 'crit_chance':
        bonuses.critChance += totalBonus;
        break;
      case 'production':
        bonuses.production += totalBonus;
        break;
      case 'offline':
        bonuses.offline += totalBonus;
        break;
      case 'combo_duration':
        bonuses.comboDuration += totalBonus;
        break;
      case 'golden_chance':
        bonuses.goldenChance += totalBonus;
        break;
      case 'click_power':
        bonuses.clickPower += totalBonus;
        break;
      case 'all_stats':
        bonuses.allStats += totalBonus;
        break;
      default:
        break;
    }
  });

  return bonuses;
}

/**
 * Get boss tier by accumulated essence
 */
export function getBossTierForEssence(lifetimeEssence) {
  const tiers = BOSS_CONFIG.tiers;

  // Scale boss tier based on lifetime essence
  if (lifetimeEssence >= 100000000000) return tiers[3]; // 100B+
  if (lifetimeEssence >= 1000000000) return tiers[2];   // 1B+
  if (lifetimeEssence >= 10000000) return tiers[1];     // 10M+
  return tiers[0]; // Default to first tier
}

// ===========================================
// GAMBLE SYSTEM CONFIG
// ===========================================

export const BET_TYPES = {
  safe: { name: 'Safe Bet', winChance: 70, multiplier: 1.5, color: '#10B981' },
  risky: { name: 'Risky Bet', winChance: 50, multiplier: 2.5, color: '#F59E0B' },
  extreme: { name: 'All or Nothing', winChance: 30, multiplier: 5.0, color: '#EF4444' }
};

// ===========================================
// WEEKLY TOURNAMENT CONFIG (v4.0 ENHANCED)
// ===========================================

// v4.0: Champion tier rebalanced from 100B to 25B for achievability
export const TOURNAMENT_TIER_CONFIG = {
  Bronze: { color: '#CD7F32', colorEnd: '#8B4513', minEssence: 10000000 },        // 10M
  Silver: { color: '#C0C0C0', colorEnd: '#808080', minEssence: 100000000 },       // 100M
  Gold: { color: '#FFD700', colorEnd: '#FFA500', minEssence: 500000000 },         // 500M
  Platinum: { color: '#E5E4E2', colorEnd: '#B4B4B4', minEssence: 2000000000 },    // 2B
  Diamond: { color: '#B9F2FF', colorEnd: '#40E0D0', minEssence: 10000000000 },    // 10B
  Champion: { color: '#FF6B6B', colorEnd: '#FFD93D', minEssence: 25000000000 }    // v4.0: 25B (was 100B)
};

// v4.0: Rebalanced to fit within FP cap
export const TOURNAMENT_TIER_REWARDS = {
  Bronze: { fatePoints: 5, rollTickets: 2 },
  Silver: { fatePoints: 12, rollTickets: 4 },
  Gold: { fatePoints: 25, rollTickets: 8 },
  Platinum: { fatePoints: 40, rollTickets: 15 },
  Diamond: { fatePoints: 60, rollTickets: 25 },
  Champion: { fatePoints: 75, rollTickets: 40 }
};

// ===========================================
// RANK-BASED REWARDS (NEW v4.0)
// ===========================================

export const RANK_REWARDS = [
  {
    minRank: 1, maxRank: 1,
    rewards: { fatePoints: 25, rollTickets: 10, premiumTickets: 3 },
    cosmetics: ['frame_champion_gold', 'title_weekly_champion'],
    title: 'Weekly Champion'
  },
  {
    minRank: 2, maxRank: 2,
    rewards: { fatePoints: 15, rollTickets: 7, premiumTickets: 2 },
    cosmetics: ['frame_podium_silver'],
    title: 'Runner Up'
  },
  {
    minRank: 3, maxRank: 3,
    rewards: { fatePoints: 10, rollTickets: 5, premiumTickets: 1 },
    cosmetics: ['frame_podium_bronze'],
    title: 'Third Place'
  },
  {
    minRank: 4, maxRank: 10,
    rewards: { fatePoints: 5, rollTickets: 3, premiumTickets: 0 },
    cosmetics: ['badge_top_10'],
    title: null
  },
  {
    minRank: 11, maxRank: 25,
    rewards: { fatePoints: 3, rollTickets: 2, premiumTickets: 0 },
    cosmetics: [],
    title: null
  },
  {
    minRank: 26, maxRank: 50,
    rewards: { fatePoints: 0, rollTickets: 2, premiumTickets: 0 },
    cosmetics: [],
    title: null
  },
  {
    minRank: 51, maxRank: 100,
    rewards: { fatePoints: 0, rollTickets: 1, premiumTickets: 0 },
    cosmetics: [],
    title: null
  }
];

// ===========================================
// BRACKET SYSTEM (NEW v4.0)
// ===========================================

export const BRACKET_SYSTEM = {
  S: {
    name: 'Champion',
    description: 'Top performers compete for ultimate glory',
    color: '#FFD700',
    icon: 'crown'
  },
  A: {
    name: 'Challenger',
    description: 'Skilled players pushing for the top',
    color: '#C0C0C0',
    icon: 'sword'
  },
  B: {
    name: 'Competitor',
    description: 'Active participants making their mark',
    color: '#CD7F32',
    icon: 'shield'
  },
  C: {
    name: 'Newcomer',
    description: 'New or casual players finding their footing',
    color: '#9CA3AF',
    icon: 'star'
  }
};

// ===========================================
// DAILY CHECKPOINTS (NEW v4.0)
// ===========================================

// Full config matching backend structure
export const DAILY_CHECKPOINTS_CONFIG = {
  checkpoints: [
    { day: 1, cumulativeTarget: 50000000, rewards: { rollTickets: 1 }, name: 'Monday Start' },
    { day: 2, cumulativeTarget: 150000000, rewards: { rollTickets: 1 }, name: 'Tuesday Push' },
    { day: 3, cumulativeTarget: 300000000, rewards: { rollTickets: 1, fatePoints: 3 }, name: 'Midweek Milestone' },
    { day: 4, cumulativeTarget: 500000000, rewards: { rollTickets: 2 }, name: 'Thursday Threshold' },
    { day: 5, cumulativeTarget: 800000000, rewards: { rollTickets: 2 }, name: 'Friday Focus' },
    { day: 6, cumulativeTarget: 1200000000, rewards: { rollTickets: 2, fatePoints: 5 }, name: 'Saturday Sprint' },
    { day: 7, cumulativeTarget: 2000000000, rewards: { rollTickets: 3 }, name: 'Sunday Finish' }
  ],
  totalRewards: {
    rollTickets: 12,
    fatePoints: 8
  }
};

// Export as array for backwards compatibility with UI components
export const DAILY_CHECKPOINTS = DAILY_CHECKPOINTS_CONFIG.checkpoints;

// ===========================================
// BURNING HOURS (NEW v4.0)
// ===========================================

export const BURNING_HOURS = {
  duration: 7200000,        // 2 hours
  multiplier: 2.0,          // 2x essence
  colors: {
    active: '#EF4444',
    upcoming: '#F59E0B',
    inactive: '#6B7280'
  }
};

// ===========================================
// TOURNAMENT STREAKS (NEW v4.0)
// ===========================================

// Full config matching backend structure
export const TOURNAMENT_STREAKS_CONFIG = {
  milestones: [
    { weeks: 2, essenceBonus: 0.05, rewards: null, cosmetics: null },
    { weeks: 4, essenceBonus: 0.10, rewards: { rollTickets: 3 }, cosmetics: ['badge_streak_4'] },
    { weeks: 8, essenceBonus: 0.15, rewards: { rollTickets: 5, premiumTickets: 1 }, cosmetics: ['badge_streak_8', 'frame_dedicated'] },
    { weeks: 12, essenceBonus: 0.20, rewards: { rollTickets: 10, premiumTickets: 3 }, cosmetics: ['badge_streak_12', 'frame_veteran', 'title_tournament_veteran'] }
  ],
  minimumEssenceToMaintain: 10000000,  // 10M essence minimum
  gracePeriodWeeks: 0,                  // No grace period
  maxEssenceBonus: 0.25                 // Cap at 25% bonus
};

// Export as array for backwards compatibility with UI components
export const TOURNAMENT_STREAKS = TOURNAMENT_STREAKS_CONFIG.milestones;

// ===========================================
// TOURNAMENT COSMETICS (NEW v4.0)
// ===========================================

export const TOURNAMENT_COSMETICS = {
  frame_champion_gold: {
    id: 'frame_champion_gold',
    type: 'avatar_frame',
    name: "Champion's Laurel",
    description: 'Awarded to #1 tournament finisher',
    rarity: 'legendary'
  },
  title_weekly_champion: {
    id: 'title_weekly_champion',
    type: 'profile_title',
    name: 'Weekly Champion',
    description: 'Finished #1 in weekly tournament',
    rarity: 'legendary',
    displayText: 'Weekly Champion'
  },
  frame_podium_silver: {
    id: 'frame_podium_silver',
    type: 'avatar_frame',
    name: 'Silver Podium',
    description: 'Finished 2nd in weekly tournament',
    rarity: 'epic'
  },
  frame_podium_bronze: {
    id: 'frame_podium_bronze',
    type: 'avatar_frame',
    name: 'Bronze Podium',
    description: 'Finished 3rd in weekly tournament',
    rarity: 'rare'
  },
  badge_top_10: {
    id: 'badge_top_10',
    type: 'badge',
    name: 'Top 10',
    description: 'Finished in top 10 of tournament bracket',
    rarity: 'rare'
  },
  badge_streak_4: {
    id: 'badge_streak_4',
    type: 'badge',
    name: '4-Week Streak',
    description: 'Participated in 4 consecutive tournaments',
    rarity: 'uncommon'
  },
  badge_streak_8: {
    id: 'badge_streak_8',
    type: 'badge',
    name: '8-Week Streak',
    description: 'Participated in 8 consecutive tournaments',
    rarity: 'rare'
  },
  badge_streak_12: {
    id: 'badge_streak_12',
    type: 'badge',
    name: '12-Week Streak',
    description: 'Participated in 12 consecutive tournaments',
    rarity: 'epic'
  },
  frame_dedicated: {
    id: 'frame_dedicated',
    type: 'avatar_frame',
    name: 'Dedicated Player',
    description: '8-week tournament streak achievement',
    rarity: 'rare'
  },
  frame_veteran: {
    id: 'frame_veteran',
    type: 'avatar_frame',
    name: 'Tournament Veteran',
    description: '12-week tournament streak achievement',
    rarity: 'epic'
  },
  title_tournament_veteran: {
    id: 'title_tournament_veteran',
    type: 'profile_title',
    name: 'Tournament Veteran',
    description: '12-week tournament streak achievement',
    rarity: 'epic',
    displayText: 'Tournament Veteran'
  },
  frame_bracket_champion: {
    id: 'frame_bracket_champion',
    type: 'avatar_frame',
    name: 'Bracket Champion',
    description: 'Won first place in your bracket',
    rarity: 'rare'
  },
  title_champion_tier: {
    id: 'title_champion_tier',
    type: 'profile_title',
    name: 'Essence Champion',
    description: 'Reached Champion tier in tournament',
    rarity: 'legendary',
    displayText: 'Essence Champion'
  }
};

// ===========================================
// INFUSION SYSTEM CONFIG
// ===========================================

export const INFUSION_CONFIG = {
  bonusPerInfusion: 0.10,  // Each infusion gives +10% (synced with backend INFUSION_CONFIG.bonusPerUse)
  baseCostPercent: 0.5,    // 50% base cost percent (synced with backend)
  costIncreasePerUse: 0.05,// +5% per infusion (synced with backend)
  maxCostPercent: 0.80,    // Cap at 80% (synced with backend)
  minimumEssence: 100000,  // Minimum essence required (synced with backend)
  maxPerPrestige: 5        // Maximum infusions per prestige (synced with backend)
};

// ===========================================
// ELEMENT DISPLAY CONSTANTS
// ===========================================

// Element icons mapping for use across components
// Keys correspond to icon component names from constants/icons
export const ELEMENT_ICON_NAMES = {
  fire: 'IconFlame',
  water: 'IconWater',
  earth: 'IconEarth',
  air: 'IconAir',
  light: 'IconLight',
  dark: 'IconDark',
  neutral: 'IconNeutral'
};

// Element colors derived from CHARACTER_ABILITIES
export const ELEMENT_COLORS = Object.fromEntries(
  Object.entries(CHARACTER_ABILITIES).map(([key, ability]) => [key, ability.color])
);

export default {
  COMBO_CONFIG,
  CLICK_CONFIG,
  GOLDEN_CONFIG,
  CHARACTER_BONUSES,
  UNDERDOG_BONUSES,
  CHARACTER_ABILITIES,
  SERIES_SYNERGIES,
  ELEMENT_SYNERGIES,
  DAILY_MODIFIERS,
  ACTIVE_ABILITIES,
  BOSS_CONFIG,
  ESSENCE_TYPES,
  ACHIEVEMENTS,
  SOUND_EFFECTS,
  UI_TIMING,
  BET_TYPES,
  TOURNAMENT_TIER_CONFIG,
  TOURNAMENT_TIER_REWARDS,
  RANK_REWARDS,
  BRACKET_SYSTEM,
  DAILY_CHECKPOINTS,
  BURNING_HOURS,
  TOURNAMENT_STREAKS,
  TOURNAMENT_COSMETICS,
  INFUSION_CONFIG,
  ELEMENT_ICON_NAMES,
  ELEMENT_COLORS,
  getCurrentDailyModifier,
  calculateCharacterBonus,
  calculateElementBonuses,
  getBossTierForEssence
};
