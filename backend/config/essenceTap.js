/**
 * Essence Tap Clicker Game Configuration
 *
 * This file defines all balancing constants for the Essence Tap minigame.
 * The game is an idle/incremental clicker where players tap to generate essence,
 * purchase generators for passive income, and prestige for permanent multipliers.
 *
 * BALANCE PHILOSOPHY:
 * - Early game (0-10 min): Fast, rewarding, hook the player with 2-3 upgrades
 * - Mid game (hours 1-10): Steady progression with meaningful choices
 * - Late game (days 1-7): Slower but satisfying, prestige farming begins
 * - Endgame (weeks 2-4): Final generators, optimization, mastery
 *
 * VERSION HISTORY:
 * See backend/config/CHANGELOG.md for detailed version history and changes.
 */

// ===========================================
// GENERATOR DEFINITIONS
// ===========================================

/**
 * Generator tiers with exponentially scaling costs and output
 * Each generator produces essence per second automatically
 */
const GENERATORS = [
  {
    id: 'essence_sprite',
    name: 'Essence Sprite',
    description: 'A tiny magical sprite that gathers essence',
    baseOutput: 0.5,
    baseCost: 15,
    costMultiplier: 1.15,
    unlockEssence: 0,
    icon: 'sprite',
    tier: 1
  },
  {
    id: 'mana_well',
    name: 'Mana Well',
    description: 'A mystical well that draws essence from the earth',
    baseOutput: 3,
    baseCost: 150,
    costMultiplier: 1.15,
    unlockEssence: 100,
    icon: 'well',
    tier: 2
  },
  {
    id: 'crystal_node',
    name: 'Crystal Node',
    description: 'Crystalline formation resonating with magical energy',
    baseOutput: 15,
    baseCost: 2000,
    costMultiplier: 1.15,
    unlockEssence: 1500,
    icon: 'crystal',
    tier: 3
  },
  {
    id: 'arcane_altar',
    name: 'Arcane Altar',
    description: 'Ancient altar channeling pure arcane power',
    baseOutput: 75,
    baseCost: 30000,
    costMultiplier: 1.15,
    unlockEssence: 25000,
    icon: 'altar',
    tier: 4
  },
  {
    id: 'spirit_beacon',
    name: 'Spirit Beacon',
    description: 'A beacon that attracts wandering spirits',
    baseOutput: 400,
    baseCost: 500000,
    costMultiplier: 1.15,
    unlockEssence: 400000,
    icon: 'beacon',
    tier: 5
  },
  {
    id: 'void_rift',
    name: 'Void Rift',
    description: 'A tear in reality leaking pure essence',
    baseOutput: 2500,
    baseCost: 10000000,
    costMultiplier: 1.15,
    unlockEssence: 8000000,
    icon: 'rift',
    tier: 6
  },
  {
    id: 'celestial_gate',
    name: 'Celestial Gate',
    description: 'A gateway to the celestial realm of infinite essence',
    baseOutput: 15000,
    baseCost: 250000000,
    costMultiplier: 1.15,
    unlockEssence: 200000000,
    icon: 'gate',
    tier: 7
  },
  {
    id: 'eternal_nexus',
    name: 'Eternal Nexus',
    description: 'The convergence point of all magical energies',
    baseOutput: 100000,
    baseCost: 7500000000,
    costMultiplier: 1.15,
    unlockEssence: 6000000000,
    icon: 'nexus',
    tier: 8
  },
  {
    id: 'primordial_core',
    name: 'Primordial Core',
    description: 'The heart of creation itself',
    baseOutput: 750000,
    baseCost: 250000000000,
    costMultiplier: 1.15,
    unlockEssence: 200000000000,
    icon: 'core',
    tier: 9
  },
  {
    id: 'infinity_engine',
    name: 'Infinity Engine',
    description: 'A machine that generates essence from nothing',
    baseOutput: 5000000,
    baseCost: 10000000000000,
    costMultiplier: 1.15,
    unlockEssence: 8000000000000,
    icon: 'engine',
    tier: 10
  }
];

// ===========================================
// UPGRADE DEFINITIONS
// ===========================================

/**
 * Click upgrades - improve active clicking
 */
const CLICK_UPGRADES = [
  {
    id: 'click_power_1',
    name: 'Focused Tap',
    description: '+0.5 essence per click',
    type: 'click_power',
    bonus: 0.5,
    cost: 200,
    unlockEssence: 150,
    tier: 1
  },
  {
    id: 'click_power_2',
    name: 'Empowered Tap',
    description: '+1 essence per click',
    type: 'click_power',
    bonus: 1,
    cost: 2500,
    unlockEssence: 2000,
    tier: 2
  },
  {
    id: 'click_power_3',
    name: 'Mighty Tap',
    description: '+3 essence per click',
    type: 'click_power',
    bonus: 3,
    cost: 50000,
    unlockEssence: 40000,
    tier: 3
  },
  {
    id: 'click_power_4',
    name: 'Devastating Tap',
    description: '+8 essence per click',
    type: 'click_power',
    bonus: 8,
    cost: 1000000,
    unlockEssence: 800000,
    tier: 4
  },
  {
    id: 'click_power_5',
    name: 'Legendary Tap',
    description: '+20 essence per click',
    type: 'click_power',
    bonus: 20,
    cost: 25000000,
    unlockEssence: 20000000,
    tier: 5
  },
  {
    id: 'crit_chance_1',
    name: 'Lucky Strike',
    description: '+3% critical click chance',
    type: 'crit_chance',
    bonus: 0.03,
    cost: 5000,
    unlockEssence: 4000,
    tier: 1
  },
  {
    id: 'crit_chance_2',
    name: 'Fortune\'s Favor',
    description: '+3% critical click chance',
    type: 'crit_chance',
    bonus: 0.03,
    cost: 100000,
    unlockEssence: 80000,
    tier: 2
  },
  {
    id: 'crit_chance_3',
    name: 'Blessed Strikes',
    description: '+5% critical click chance',
    type: 'crit_chance',
    bonus: 0.05,
    cost: 2500000,
    unlockEssence: 2000000,
    tier: 3
  },
  {
    id: 'crit_mult_1',
    name: 'Critical Mastery',
    description: '+3x critical multiplier',
    type: 'crit_multiplier',
    bonus: 3,
    cost: 25000,
    unlockEssence: 20000,
    tier: 1
  },
  {
    id: 'crit_mult_2',
    name: 'Devastating Criticals',
    description: '+5x critical multiplier',
    type: 'crit_multiplier',
    bonus: 5,
    cost: 500000,
    unlockEssence: 400000,
    tier: 2
  },
  {
    id: 'crit_mult_3',
    name: 'Legendary Criticals',
    description: '+10x critical multiplier',
    type: 'crit_multiplier',
    bonus: 10,
    cost: 12500000,
    unlockEssence: 10000000,
    tier: 3
  }
];

/**
 * Generator upgrades - boost generator output
 */
const GENERATOR_UPGRADES = [
  {
    id: 'sprite_boost_1',
    name: 'Sprite Training',
    description: 'Essence Sprites produce 2x essence',
    generatorId: 'essence_sprite',
    multiplier: 2,
    cost: 5000,              // v3.0: Increased from 1000
    requiredOwned: 15        // v3.0: Increased from 10
  },
  {
    id: 'sprite_boost_2',
    name: 'Sprite Mastery',
    description: 'Essence Sprites produce 2x essence',
    generatorId: 'essence_sprite',
    multiplier: 2,
    cost: 500000,            // v3.0: Increased from 50000
    requiredOwned: 75        // v3.0: Increased from 50
  },
  {
    id: 'well_boost_1',
    name: 'Deep Wells',
    description: 'Mana Wells produce 2x essence',
    generatorId: 'mana_well',
    multiplier: 2,
    cost: 100000,            // v3.0: Increased from 10000
    requiredOwned: 15        // v3.0: Increased from 10
  },
  {
    id: 'well_boost_2',
    name: 'Bottomless Wells',
    description: 'Mana Wells produce 2x essence',
    generatorId: 'mana_well',
    multiplier: 2,
    cost: 7500000,           // v3.0: Increased from 500000
    requiredOwned: 75        // v3.0: Increased from 50
  },
  {
    id: 'crystal_boost_1',
    name: 'Crystal Resonance',
    description: 'Crystal Nodes produce 2x essence',
    generatorId: 'crystal_node',
    multiplier: 2,
    cost: 2500000,           // v3.0: Increased from 100000
    requiredOwned: 15        // v3.0: Increased from 10
  },
  {
    id: 'altar_boost_1',
    name: 'Altar Consecration',
    description: 'Arcane Altars produce 2x essence',
    generatorId: 'arcane_altar',
    multiplier: 2,
    cost: 50000000,          // v3.0: Increased from 1000000
    requiredOwned: 15        // v3.0: Increased from 10
  },
  {
    id: 'beacon_boost_1',
    name: 'Spirit Calling',
    description: 'Spirit Beacons produce 2x essence',
    generatorId: 'spirit_beacon',
    multiplier: 2,
    cost: 1000000000,        // v3.0: Increased from 10000000
    requiredOwned: 15        // v3.0: Increased from 10
  }
];

/**
 * Global upgrades - affect all production
 */
const GLOBAL_UPGRADES = [
  {
    id: 'global_mult_1',
    name: 'Essence Attunement',
    description: '+10% to all essence production',
    type: 'global_multiplier',
    multiplier: 1.10,
    cost: 100000,            // v3.0: Increased from 10000
    unlockEssence: 80000     // v3.0: Increased from 5000
  },
  {
    id: 'global_mult_2',
    name: 'Essence Mastery',
    description: '+25% to all essence production',
    type: 'global_multiplier',
    multiplier: 1.25,
    cost: 2500000,           // v3.0: Increased from 100000
    unlockEssence: 2000000   // v3.0: Increased from 50000
  },
  {
    id: 'global_mult_3',
    name: 'Essence Dominion',
    description: '+50% to all essence production',
    type: 'global_multiplier',
    multiplier: 1.50,
    cost: 75000000,          // v3.0: Increased from 1000000
    unlockEssence: 60000000  // v3.0: Increased from 500000
  },
  {
    id: 'global_mult_4',
    name: 'Essence Supremacy',
    description: '+100% to all essence production',
    type: 'global_multiplier',
    multiplier: 2.0,
    cost: 2500000000,        // v3.0: Increased from 10000000
    unlockEssence: 2000000000 // v3.0: Increased from 5000000
  }
];

/**
 * Synergy upgrades - generators boost each other
 */
const SYNERGY_UPGRADES = [
  {
    id: 'synergy_sprite_well',
    name: 'Sprite-Well Harmony',
    description: 'Each Essence Sprite boosts Mana Wells by 1%',
    sourceGenerator: 'essence_sprite',
    targetGenerator: 'mana_well',
    bonusPerSource: 0.01,
    cost: 750000,            // v3.0: Increased from 50000
    unlockEssence: 500000    // v3.0: Increased from 20000
  },
  {
    id: 'synergy_well_crystal',
    name: 'Well-Crystal Flow',
    description: 'Each Mana Well boosts Crystal Nodes by 1%',
    sourceGenerator: 'mana_well',
    targetGenerator: 'crystal_node',
    bonusPerSource: 0.01,
    cost: 10000000,          // v3.0: Increased from 500000
    unlockEssence: 8000000   // v3.0: Increased from 200000
  },
  {
    id: 'synergy_crystal_altar',
    name: 'Crystal-Altar Resonance',
    description: 'Each Crystal Node boosts Arcane Altars by 1%',
    sourceGenerator: 'crystal_node',
    targetGenerator: 'arcane_altar',
    bonusPerSource: 0.01,
    cost: 150000000,         // v3.0: Increased from 5000000
    unlockEssence: 100000000 // v3.0: Increased from 2000000
  }
];

// ===========================================
// PRESTIGE SYSTEM
// ===========================================

/**
 * Prestige (Awakening) configuration
 * Players can reset progress for permanent multipliers
 */
const PRESTIGE_CONFIG = {
  // Minimum lifetime essence to prestige
  minimumEssence: 50000000,  // v3.0: Increased from 1000000 (50M)

  // Prestige cooldown to prevent FP farming (in milliseconds)
  // Players must wait 4 hours between prestiges
  cooldownMs: 14400000,  // v3.0: Increased from 3600000 (4 hours)

  // Formula for awakening shards: floor(sqrt(lifetimeEssence / divisor))
  shardDivisor: 10000000,  // v3.0: Increased from 1000000 (10M)

  // Shards provide permanent multiplier: 1 + (shards * shardMultiplier)
  shardMultiplier: 0.02,  // v3.0: Increased from 0.01 (2% per shard)

  // Maximum shards (soft cap)
  maxEffectiveShards: 500,  // v3.0: Reduced from 1000 (balance with higher multiplier)

  // Prestige upgrades purchasable with shards
  upgrades: [
    {
      id: 'prestige_click',
      name: 'Awakened Tap',
      description: 'Permanent +1 click power per level',
      type: 'click_power',
      bonusPerLevel: 1,      // v3.0: Reduced from 2
      maxLevel: 50,
      baseCost: 2,           // v3.0: Increased from 1
      costMultiplier: 1.5
    },
    {
      id: 'prestige_crit',
      name: 'Awakened Fortune',
      description: 'Permanent +0.5% crit chance per level',
      type: 'crit_chance',
      bonusPerLevel: 0.005,  // v3.0: Reduced from 0.01
      maxLevel: 30,
      baseCost: 3,           // v3.0: Increased from 2
      costMultiplier: 1.8
    },
    {
      id: 'prestige_production',
      name: 'Awakened Flow',
      description: 'Permanent +3% production per level',
      type: 'production',
      bonusPerLevel: 0.03,   // v3.0: Reduced from 0.05
      maxLevel: 100,
      baseCost: 4,           // v3.0: Increased from 3
      costMultiplier: 1.4
    },
    {
      id: 'prestige_offline',
      name: 'Awakened Dreams',
      description: 'Permanent +3% offline efficiency per level',
      type: 'offline',
      bonusPerLevel: 0.03,   // v3.0: Reduced from 0.05
      maxLevel: 20,
      baseCost: 6,           // v3.0: Increased from 5
      costMultiplier: 2.0
    },
    {
      id: 'prestige_starting',
      name: 'Awakened Beginning',
      description: 'Start with bonus essence after prestige',
      type: 'starting_essence',
      bonusPerLevel: 5000,   // v3.0: Increased from 1000 (meaningful starting boost)
      maxLevel: 100,
      baseCost: 3,           // v3.0: Increased from 2
      costMultiplier: 1.3
    }
  ]
};

// ===========================================
// GAME MECHANICS
// ===========================================

/**
 * Core game mechanics configuration
 */
const GAME_CONFIG = {
  // Click mechanics
  baseClickPower: 1,
  baseCritChance: 0.01,      // 1% base crit chance
  baseCritMultiplier: 10,    // 10x damage on crit
  maxClicksPerSecond: 20,    // Anti-macro rate limit

  // NEW: Click power scaling with generators
  // Click power increases by this percentage per total generator owned
  clickPowerPerGenerator: 0.001,  // +0.1% per generator
  maxClickPowerFromGenerators: 2.0,  // Cap at +200%

  // Combo system - increased decay time for mobile friendliness
  comboDecayTime: 1500,      // ms before combo resets (was 1000, increased for mobile)
  maxComboMultiplier: 2.5,   // Max combo bonus (increased from 2.0)
  comboGrowthRate: 0.08,     // Multiplier increase per click (slightly slower for balance)

  // Offline progress
  maxOfflineHours: 8,        // Maximum hours of offline gains
  offlineEfficiency: 0.5,    // 50% of active production offline

  // Character bonuses by rarity
  characterBonuses: {
    common: 0.05,      // +5%
    uncommon: 0.10,    // +10%
    rare: 0.20,        // +20%
    epic: 0.35,        // +35%
    legendary: 0.50    // +50%
  },

  // NEW: Underdog bonus - common/uncommon characters get bonus when used
  underdogBonuses: {
    common: 0.15,      // +15% extra when using common characters
    uncommon: 0.10     // +10% extra when using uncommon characters
  },

  // Maximum assigned characters for bonus
  maxAssignedCharacters: 5,

  // Golden essence events
  goldenEssenceChance: 0.001,    // 0.1% chance per click
  goldenEssenceMultiplier: 100,  // 100x the normal click value

  // Auto-save interval (ms)
  autoSaveInterval: 30000
};

// ===========================================
// CHARACTER MASTERY SYSTEM (NEW)
// ===========================================

/**
 * Character mastery for Essence Tap
 * Characters gain mastery XP when assigned and used
 * Each mastery level provides additional bonuses
 */
const CHARACTER_MASTERY = {
  // Maximum mastery level per character
  maxLevel: 10,

  // Mastery levels with hours required and bonuses
  levels: [
    { level: 1, hoursRequired: 0, productionBonus: 0.00, unlockedAbility: null },
    { level: 2, hoursRequired: 1, productionBonus: 0.02, unlockedAbility: null },
    { level: 3, hoursRequired: 3, productionBonus: 0.04, unlockedAbility: null },
    { level: 4, hoursRequired: 7, productionBonus: 0.06, unlockedAbility: null },
    { level: 5, hoursRequired: 15, productionBonus: 0.08, unlockedAbility: 'enhanced_element' },
    { level: 6, hoursRequired: 30, productionBonus: 0.10, unlockedAbility: null },
    { level: 7, hoursRequired: 60, productionBonus: 0.12, unlockedAbility: null },
    { level: 8, hoursRequired: 120, productionBonus: 0.14, unlockedAbility: null },
    { level: 9, hoursRequired: 250, productionBonus: 0.16, unlockedAbility: null },
    { level: 10, hoursRequired: 500, productionBonus: 0.20, unlockedAbility: 'mastery_aura' }
  ],

  // XP required per level (cumulative) - legacy
  xpPerLevel: [
    0,        // Level 1 (start)
    1000,     // Level 2
    3000,     // Level 3
    7000,     // Level 4
    15000,    // Level 5
    30000,    // Level 6
    60000,    // Level 7
    120000,   // Level 8
    250000,   // Level 9
    500000    // Level 10 (max)
  ],

  // XP earned per hour while assigned
  xpPerHour: 100,

  // Bonus per mastery level (+2% per level, max +20%)
  bonusPerLevel: 0.02,

  // Special ability unlocks at certain levels
  abilityUnlocks: {
    5: 'enhanced_element',    // Element bonus doubled
    10: 'mastery_aura'        // Boosts other characters by 5%
  },

  // Account XP reward for reaching max mastery
  maxMasteryAccountXP: 50
};

// ===========================================
// ESSENCE TYPES (NEW)
// ===========================================

/**
 * Essence type variety for strategic depth
 * Different essence types are produced by different sources
 */
const ESSENCE_TYPES = {
  pure: {
    id: 'pure',
    name: 'Pure Essence',
    description: 'Generated from clicks only',
    color: '#A855F7',
    sources: ['clicks', 'crits', 'golden'],
    conversionRate: 1.0  // 1:1 to base essence
  },
  ambient: {
    id: 'ambient',
    name: 'Ambient Essence',
    description: 'Generated passively from generators',
    color: '#3B82F6',
    sources: ['generators', 'offline'],
    conversionRate: 1.0
  },
  golden: {
    id: 'golden',
    name: 'Golden Essence',
    description: 'Rare essence from golden events',
    color: '#F59E0B',
    sources: ['golden_clicks', 'golden_rush'],
    conversionRate: 10.0  // 10x value
  },
  prismatic: {
    id: 'prismatic',
    name: 'Prismatic Essence',
    description: 'Ultra-rare essence from special events',
    color: '#EC4899',
    sources: ['jackpot', 'weekly_tournament', 'mastery_complete'],
    conversionRate: 100.0,  // 100x value
    requirement: 10000  // Prismatic essence needed for max bonus scaling
  }
};

/**
 * Essence type requirements for upgrades
 * Some upgrades require specific essence types
 */
const ESSENCE_REQUIREMENTS = {
  // Premium upgrades require golden essence percentage
  premium_upgrades: {
    requiredGoldenPercent: 0.10  // 10% of cost must be golden
  },
  // Prestige upgrades require prismatic
  prestige_premium: {
    requiredPrismaticPercent: 0.05  // 5% of cost must be prismatic
  }
};

// ===========================================
// SERIES SYNERGY BONUSES (NEW)
// ===========================================

/**
 * Series synergy bonuses (matching dojo system)
 * Characters from the same series provide bonus when used together
 */
const SERIES_SYNERGIES = {
  // Bonus per matching character from same series
  matchBonuses: {
    2: 0.10,   // 2 from same series: +10%
    3: 0.25,   // 3 from same series: +25%
    4: 0.45,   // 4 from same series: +45%
    5: 0.70    // Full team same series: +70%
  },

  // Maximum total synergy bonus (prevents stacking exploits)
  maxSynergyBonus: 1.00,  // Cap at +100%

  // Diversity bonus (all different series)
  diversityBonus: 0.15,  // +15% if all 5 characters from different series
  diversityThreshold: 5,  // Need 5 different series for diversity bonus

  // Featured series rotation (changes weekly)
  featuredSeriesBonus: 0.25  // +25% extra for using featured series
};

// ===========================================
// FATE POINTS INTEGRATION
// ===========================================

/**
 * Milestones that reward Fate Points (one-time)
 */
const FATE_POINT_MILESTONES = [
  { lifetimeEssence: 10000000, fatePoints: 5, claimed: false },     // v3.0: Was 1M
  { lifetimeEssence: 100000000, fatePoints: 10, claimed: false },   // v3.0: Was 10M
  { lifetimeEssence: 1000000000, fatePoints: 15, claimed: false },  // v3.0: Was 100M
  { lifetimeEssence: 10000000000, fatePoints: 25, claimed: false }, // v3.0: Was 1B
  { lifetimeEssence: 100000000000, fatePoints: 40, claimed: false }, // v3.0: Was 10B
  { lifetimeEssence: 1000000000000, fatePoints: 60, claimed: false }, // v3.0: NEW - 1T milestone
  { lifetimeEssence: 10000000000000, fatePoints: 100, claimed: false } // v3.0: NEW - 10T endgame
];

/**
 * Repeatable milestones for ongoing FP rewards
 * These reset weekly and provide continuous engagement
 */
const REPEATABLE_MILESTONES = {
  // Weekly essence milestone
  weeklyEssence: {
    threshold: 1000000000,  // v3.0: 1B essence per week (was 100M)
    fatePoints: 20,
    rollTickets: 3
  },
  // Weekly click goal
  weeklyClicks: {
    threshold: 10000,      // 10,000 clicks per week (unchanged)
    fatePoints: 8,
    rollTickets: 2
  },
  // Weekly prestige goal (prestige at least once per week)
  weeklyPrestige: {
    threshold: 1,
    fatePoints: 12,
    premiumTickets: 1
  },
  // Essence earned per 1T (repeatable indefinitely)
  essencePer1T: {
    threshold: 1000000000000,  // v3.0: 1T (was 100B)
    fatePoints: 25,
    repeatable: true
  }
};

/**
 * Weekly FP cap for Essence Tap to prevent economic imbalance
 * This ensures Essence Tap doesn't outpace gacha FP generation
 */
const WEEKLY_FP_CAP = {
  maxFatePointsPerWeek: 100,  // Max 100 FP from Essence Tap per week (vs 500 from gacha)
  includesMilestones: true,   // One-time milestones don't count toward cap
  includesPrestige: true,     // Prestige FP counts toward cap
  includesTournament: true    // Tournament FP counts toward cap
};

/**
 * Prestige rewards Fate Points
 */
const PRESTIGE_FATE_REWARDS = {
  firstPrestige: 20,  // Reduced from 25
  perPrestige: 8,     // Reduced from 10
  maxPrestigeRewards: 10  // After 10 prestiges, no more FP from prestige
};

/**
 * Mini-milestones for short mobile sessions
 * These provide frequent dopamine hits in 2-5 minute sessions
 */
const MINI_MILESTONES = {
  // Session-based milestones (reset on page load)
  sessionMilestones: [
    { essence: 5000, reward: { xp: 5 }, name: 'Quick Start' },        // v3.0: Reduced from 10k
    { essence: 25000, reward: { xp: 10 }, name: 'Warming Up' },       // v3.0: Reduced from 50k
    { essence: 100000, reward: { xp: 15, rollTickets: 1 }, name: 'Getting Going' },
    { essence: 500000, reward: { xp: 25 }, name: 'In the Zone' },
    { essence: 2500000, reward: { xp: 50, rollTickets: 2 }, name: 'Million Club' } // v3.0: Increased
  ],
  // Click combo milestones (during active session)
  comboMilestones: [
    { combo: 10, reward: { essenceMultiplier: 1.1 }, name: '10 Hit Combo' },
    { combo: 25, reward: { essenceMultiplier: 1.25 }, name: '25 Hit Combo' },
    { combo: 50, reward: { essenceMultiplier: 1.5, xp: 10 }, name: '50 Hit Combo' },
    { combo: 100, reward: { essenceMultiplier: 2.0, xp: 25, rollTickets: 1 }, name: 'Century' }
  ],
  // Critical hit streak milestones
  critStreakMilestones: [
    { streak: 3, reward: { essenceMultiplier: 1.5 }, name: 'Lucky Streak' },
    { streak: 5, reward: { essenceMultiplier: 2.0, xp: 15 }, name: 'On Fire' },
    { streak: 10, reward: { essenceMultiplier: 3.0, xp: 50, rollTickets: 1 }, name: 'Unstoppable' }
  ]
};

// ===========================================
// PROFILE XP INTEGRATION
// ===========================================

/**
 * XP earned from clicker activities
 * BALANCED: Adjusted to be competitive with fishing (60-120 XP/hr active)
 * and dojo (3-6 XP/hr passive)
 */
const XP_REWARDS = {
  // XP per million essence earned (lifetime) - INCREASED from 5 to 10
  perMillionEssence: 10,

  // XP for purchasing upgrades - INCREASED from 2 to 3
  perUpgrade: 3,

  // XP for prestige - Kept at 50 (significant milestone)
  perPrestige: 50,

  // Daily essence goals - INCREASED rewards
  dailyGoals: [
    { essence: 100000, xp: 15 },      // was 10
    { essence: 1000000, xp: 35 },     // was 25
    { essence: 10000000, xp: 75 }     // was 50
  ],

  // XP for character participation (distributed to assigned characters)
  characterXPPerMillion: 5
};

// ===========================================
// DAILY CHALLENGES
// ===========================================

/**
 * Daily challenges for bonus rewards
 */
const DAILY_CHALLENGES = [
  {
    id: 'clicks_1000',
    name: 'Dedicated Tapper',
    description: 'Click 1,000 times',
    type: 'clicks',
    target: 1000,
    rewards: { essence: 50000, fatePoints: 2 }  // v3.0: Essence increased
  },
  {
    id: 'clicks_5000',
    name: 'Tireless Tapper',
    description: 'Click 5,000 times',
    type: 'clicks',
    target: 5000,
    rewards: { essence: 250000, fatePoints: 5 }  // v3.0: Essence increased
  },
  {
    id: 'earn_10million',
    name: 'Essence Collector',
    description: 'Earn 10,000,000 essence today',
    type: 'essence_earned',
    target: 10000000,  // v3.0: Was 1M
    rewards: { fatePoints: 3, rollTickets: 1 }
  },
  {
    id: 'crits_100',
    name: 'Critical Master',
    description: 'Land 100 critical clicks',
    type: 'crits',
    target: 100,
    rewards: { essence: 100000, fatePoints: 3 }  // v3.0: Essence increased
  },
  {
    id: 'buy_generators',
    name: 'Builder',
    description: 'Purchase 50 generators',
    type: 'generators_bought',
    target: 50,
    rewards: { essence: 500000 }  // v3.0: Essence increased
  }
];

// ===========================================
// CHARACTER ABILITIES BY ELEMENT
// ===========================================

/**
 * Character element abilities for Essence Tap
 * Each element provides a unique bonus when assigned
 */
const CHARACTER_ABILITIES = {
  fire: {
    id: 'fire',
    name: 'Flame Fury',
    description: '+10% crit chance per Fire character',
    type: 'crit_chance',
    bonusPerCharacter: 0.10
  },
  water: {
    id: 'water',
    name: 'Flow State',
    description: '+15% generator production per Water character',
    type: 'production',
    bonusPerCharacter: 0.15
  },
  earth: {
    id: 'earth',
    name: 'Steady Ground',
    description: '+20% offline efficiency per Earth character',
    type: 'offline',
    bonusPerCharacter: 0.20
  },
  air: {
    id: 'air',
    name: 'Swift Strikes',
    description: '+500ms combo decay time per Air character',
    type: 'combo_duration',
    bonusPerCharacter: 500
  },
  light: {
    id: 'light',
    name: 'Golden Touch',
    description: '+0.05% golden essence chance per Light character',
    type: 'golden_chance',
    bonusPerCharacter: 0.0005
  },
  dark: {
    id: 'dark',
    name: 'Shadow Power',
    description: '+20% click power per Dark character',
    type: 'click_power',
    bonusPerCharacter: 0.20
  },
  neutral: {
    id: 'neutral',
    name: 'Balance',
    description: '+5% to all stats per Neutral character',
    type: 'all_stats',
    bonusPerCharacter: 0.05
  }
};

/**
 * Element synergy bonuses when multiple characters of same element
 */
const ELEMENT_SYNERGIES = {
  // +5% bonus per matching pair of elements
  pairBonus: 0.05,
  // Full team (5 same element) special bonus
  fullTeamBonus: 0.25,
  // Mixed team (all different elements) bonus
  diversityBonus: 0.10
};

// ===========================================
// DAILY MODIFIERS
// ===========================================

/**
 * Daily rotating modifiers that change gameplay each day
 * Frontend calculates which modifier is active based on day of week
 */
const DAILY_MODIFIERS = {
  0: { // Sunday
    id: 'golden_sunday',
    name: 'Golden Sunday',
    description: '5x Golden Essence chance!',
    effects: { goldenChanceMultiplier: 5 }
  },
  1: { // Monday
    id: 'momentum_monday',
    name: 'Momentum Monday',
    description: '2x combo growth rate!',
    effects: { comboGrowthMultiplier: 2 }
  },
  2: { // Tuesday
    id: 'tap_tuesday',
    name: 'Tap Tuesday',
    description: '+50% click power!',
    effects: { clickPowerBonus: 0.5 }
  },
  3: { // Wednesday
    id: 'wealth_wednesday',
    name: 'Wealth Wednesday',
    description: '+25% generator output!',
    effects: { generatorOutputBonus: 0.25 }
  },
  4: { // Thursday
    id: 'critical_thursday',
    name: 'Critical Thursday',
    description: '2x crit multiplier!',
    effects: { critMultiplierBonus: 2 }
  },
  5: { // Friday
    id: 'fortune_friday',
    name: 'Fortune Friday',
    description: '+15% crit chance!',
    effects: { critChanceBonus: 0.15 }
  },
  6: { // Saturday
    id: 'super_saturday',
    name: 'Super Saturday',
    description: '+50% ALL production!',
    effects: { allProductionBonus: 0.5 }
  }
};

// ===========================================
// ACTIVE ABILITIES
// ===========================================

/**
 * Player-activated abilities with cooldowns
 * Unlocked through prestige progression
 */
const ACTIVE_ABILITIES = [
  {
    id: 'essence_storm',
    name: 'Essence Storm',
    description: '10x production for 5 seconds',
    duration: 5000,
    cooldown: 60000,
    unlockPrestige: 0,
    effects: { productionMultiplier: 10 }
  },
  {
    id: 'critical_focus',
    name: 'Critical Focus',
    description: 'Guaranteed crits for 3 seconds',
    duration: 3000,
    cooldown: 45000,
    unlockPrestige: 1,
    effects: { guaranteedCrits: true }
  },
  {
    id: 'golden_rush',
    name: 'Golden Rush',
    description: '50x golden chance for 10 seconds',
    duration: 10000,
    cooldown: 120000,
    unlockPrestige: 3,
    effects: { goldenChanceMultiplier: 50 }
  },
  {
    id: 'time_warp',
    name: 'Time Warp',
    description: 'Collect 30 minutes of offline progress instantly',
    duration: 0, // Instant
    cooldown: 300000,
    unlockPrestige: 5,
    effects: { offlineMinutes: 30 }
  }
];

// ===========================================
// RISK/REWARD MECHANICS
// ===========================================

/**
 * Gamble system - risk essence for multiplied rewards
 * Enhanced with progressive jackpot system
 */
const GAMBLE_CONFIG = {
  // Minimum bet amount
  minBet: 1000,

  // Maximum percentage of current essence that can be gambled
  maxBetPercent: 0.5, // 50%

  // Cooldown between gambles (seconds)
  cooldownSeconds: 15,

  // Maximum gambles per day
  maxDailyGambles: 10,

  // Bet types with win chances and multipliers
  betTypes: {
    safe: { name: 'Safe Bet', winChance: 0.70, multiplier: 1.5, jackpotContribution: 0.01 },
    risky: { name: 'Risky Bet', winChance: 0.50, multiplier: 2.5, jackpotContribution: 0.03 },
    extreme: { name: 'All or Nothing', winChance: 0.30, multiplier: 5.0, jackpotContribution: 0.05 }
  },

  // NEW: Progressive jackpot system
  jackpot: {
    // Base jackpot amount (minimum/seed)
    seedAmount: 1000000,

    // Percentage of bets that go to jackpot pool
    contributionRate: 0.10,  // 10% of bet goes to jackpot

    // Chance to win jackpot on any qualifying gamble
    winChance: 0.001,  // 0.1% base chance

    // Minimum bet amount to qualify for jackpot
    minBetToQualify: 10000,

    // Jackpot chance increases with bet type
    chanceMultipliers: {
      safe: 1.0,
      risky: 2.0,
      extreme: 5.0
    },

    // Streak bonus - jackpot chance increases with consecutive gambles
    streakBonus: {
      threshold: 5,         // After 5 consecutive gambles
      bonusPerGamble: 0.0005  // +0.05% per gamble after threshold
    },

    // Jackpot rewards
    rewards: {
      essence: 1.0,         // Full jackpot amount in essence
      fatePoints: 25,       // Bonus fate points
      rollTickets: 5,       // Bonus roll tickets
      prismaticEssence: 100 // Bonus prismatic essence
    }
  }
};

/**
 * Infusion system - permanent production boost for essence cost
 * Resets on prestige, providing an interesting decision point
 */
const INFUSION_CONFIG = {
  // Base cost is 50% of current essence
  baseCostPercent: 0.5,

  // Cost increases by this amount per infusion
  costIncreasePerUse: 0.05,

  // Maximum cost percentage
  maxCostPercent: 0.80,

  // Minimum essence required to infuse
  minimumEssence: 100000,

  // Production bonus per infusion
  bonusPerUse: 0.10, // +10% permanent

  // Maximum infusions per prestige
  maxPerPrestige: 5
};

// ===========================================
// WEEKLY TOURNAMENT SYSTEM (ENHANCED v4.0)
// ===========================================

/**
 * Weekly tournament configuration
 * Includes: brackets, rank rewards, daily checkpoints, burning hours, streaks, cosmetics
 */
const WEEKLY_TOURNAMENT = {
  // Tournament runs Monday 00:00 UTC to Sunday 23:59 UTC
  startDay: 1,  // Monday
  endDay: 0,    // Sunday

  // Tier thresholds based on essence earned
  tiers: [
    { name: 'Bronze', minEssence: 10000000 },        // 10M
    { name: 'Silver', minEssence: 100000000 },       // 100M
    { name: 'Gold', minEssence: 500000000 },         // 500M
    { name: 'Platinum', minEssence: 2000000000 },    // 2B
    { name: 'Diamond', minEssence: 10000000000 },    // 10B
    { name: 'Champion', minEssence: 25000000000 }    // v4.0: 25B (was 100B)
  ],

  // Tier rewards
  rewards: {
    Bronze: { fatePoints: 5, rollTickets: 2 },
    Silver: { fatePoints: 12, rollTickets: 4 },
    Gold: { fatePoints: 25, rollTickets: 8 },
    Platinum: { fatePoints: 40, rollTickets: 15 },
    Diamond: { fatePoints: 60, rollTickets: 25 },
    Champion: { fatePoints: 75, rollTickets: 40 }
  },

  // Participation rewards (for anyone who played)
  participationReward: {
    minimumEssence: 10000000,
    rewards: { fatePoints: 5, rollTickets: 1 }
  },

  // Featured series for the week (20% bonus for using these characters)
  featuredSeriesCount: 3,
  featuredSeriesBonus: 0.20,  // 20% essence bonus

  // Leaderboard display settings
  leaderboardSize: 100,
  refreshInterval: 300000  // 5 minutes
};

// ===========================================
// RANK-BASED REWARDS (NEW v4.0)
// ===========================================

/**
 * Rewards based on leaderboard position within bracket
 * Makes leaderboard position meaningful
 */
const RANK_REWARDS = {
  // Rank ranges and their rewards
  ranges: [
    {
      minRank: 1,
      maxRank: 1,
      rewards: {
        fatePoints: 25,
        rollTickets: 10,
        premiumTickets: 3
      },
      cosmetics: ['frame_champion_gold', 'title_weekly_champion'],
      title: 'Weekly Champion'
    },
    {
      minRank: 2,
      maxRank: 2,
      rewards: {
        fatePoints: 15,
        rollTickets: 7,
        premiumTickets: 2
      },
      cosmetics: ['frame_podium_silver'],
      title: 'Runner Up'
    },
    {
      minRank: 3,
      maxRank: 3,
      rewards: {
        fatePoints: 10,
        rollTickets: 5,
        premiumTickets: 1
      },
      cosmetics: ['frame_podium_bronze'],
      title: 'Third Place'
    },
    {
      minRank: 4,
      maxRank: 10,
      rewards: {
        fatePoints: 5,
        rollTickets: 3,
        premiumTickets: 0
      },
      cosmetics: ['badge_top_10'],
      title: null
    },
    {
      minRank: 11,
      maxRank: 25,
      rewards: {
        fatePoints: 3,
        rollTickets: 2,
        premiumTickets: 0
      },
      cosmetics: [],
      title: null
    },
    {
      minRank: 26,
      maxRank: 50,
      rewards: {
        fatePoints: 0,
        rollTickets: 2,
        premiumTickets: 0
      },
      cosmetics: [],
      title: null
    },
    {
      minRank: 51,
      maxRank: 100,
      rewards: {
        fatePoints: 0,
        rollTickets: 1,
        premiumTickets: 0
      },
      cosmetics: [],
      title: null
    }
  ],

  // Helper to get rewards for a specific rank
  getRewardsForRank: function(rank) {
    for (const range of this.ranges) {
      if (rank >= range.minRank && rank <= range.maxRank) {
        return range;
      }
    }
    return null;
  }
};

// ===========================================
// BRACKET SYSTEM (NEW v4.0)
// ===========================================

/**
 * Bracket system for fair competition
 * Players compete within their skill bracket, not globally
 */
const BRACKET_SYSTEM = {
  // Bracket definitions
  brackets: {
    S: {
      name: 'Champion',
      description: 'Top performers compete for ultimate glory',
      color: '#FFD700',
      icon: 'crown',
      percentile: { min: 0, max: 10 }  // Top 10%
    },
    A: {
      name: 'Challenger',
      description: 'Skilled players pushing for the top',
      color: '#C0C0C0',
      icon: 'sword',
      percentile: { min: 10, max: 35 }  // 10-35%
    },
    B: {
      name: 'Competitor',
      description: 'Active participants making their mark',
      color: '#CD7F32',
      icon: 'shield',
      percentile: { min: 35, max: 75 }  // 35-75%
    },
    C: {
      name: 'Newcomer',
      description: 'New or casual players finding their footing',
      color: '#9CA3AF',
      icon: 'star',
      percentile: { min: 75, max: 100 }  // Bottom 25%
    }
  },

  // Bracket size limits
  maxPlayersPerBracket: 50,

  // Promotion/demotion rules
  promotionThreshold: 0.20,  // Top 20% of bracket promotes
  demotionThreshold: 0.20,   // Bottom 20% of bracket demotes
  protectionWeeks: 1,        // New bracket players protected from demotion for 1 week

  // Default bracket for new players
  defaultBracket: 'C',

  // Minimum participation to be ranked in bracket
  minimumEssenceForRanking: 1000000  // 1M essence minimum
};

// ===========================================
// DAILY CHECKPOINTS (NEW v4.0)
// ===========================================

/**
 * Daily checkpoint rewards during tournament week
 * Creates mid-week engagement hooks
 */
const DAILY_CHECKPOINTS = {
  // Checkpoints are cumulative (not daily resets)
  checkpoints: [
    {
      day: 1,  // Monday
      cumulativeTarget: 50000000,  // 50M
      rewards: { rollTickets: 1 },
      name: 'Monday Start'
    },
    {
      day: 2,  // Tuesday
      cumulativeTarget: 150000000,  // 150M
      rewards: { rollTickets: 1 },
      name: 'Tuesday Push'
    },
    {
      day: 3,  // Wednesday
      cumulativeTarget: 300000000,  // 300M
      rewards: { rollTickets: 1, fatePoints: 3 },
      name: 'Midweek Milestone'
    },
    {
      day: 4,  // Thursday
      cumulativeTarget: 500000000,  // 500M
      rewards: { rollTickets: 2 },
      name: 'Thursday Threshold'
    },
    {
      day: 5,  // Friday
      cumulativeTarget: 800000000,  // 800M
      rewards: { rollTickets: 2 },
      name: 'Friday Focus'
    },
    {
      day: 6,  // Saturday
      cumulativeTarget: 1200000000,  // 1.2B
      rewards: { rollTickets: 2, fatePoints: 5 },
      name: 'Saturday Sprint'
    },
    {
      day: 7,  // Sunday
      cumulativeTarget: 2000000000,  // 2B
      rewards: { rollTickets: 3 },
      name: 'Sunday Finish'
    }
  ],

  // Total possible rewards from checkpoints
  totalRewards: {
    rollTickets: 12,
    fatePoints: 8
  }
};

// ===========================================
// BURNING HOUR EVENTS (NEW v4.0)
// ===========================================

/**
 * Burning hour events - limited time 2x essence multipliers
 * Creates appointment gaming and excitement
 */
const BURNING_HOURS = {
  // Event configuration
  duration: 7200000,          // 2 hours in ms
  multiplier: 2.0,            // 2x essence during burning hour
  eventsPerDay: 1,            // One burning hour per day

  // Scheduling window (UTC hours)
  scheduleWindow: {
    earliest: 6,   // 6:00 UTC
    latest: 22     // 22:00 UTC (ends by midnight)
  },

  // Notification settings
  notifyMinutesBefore: 30,    // Push notification 30 min before

  // Visual indicator colors
  colors: {
    active: '#EF4444',
    upcoming: '#F59E0B',
    inactive: '#6B7280'
  },

  // Bonus stacking rules
  stacksWithFeaturedSeries: true,
  stacksWithDailyModifiers: true,
  maxMultiplierStack: 5.0     // Cap total multiplier at 5x
};

// ===========================================
// TOURNAMENT STREAKS (NEW v4.0)
// ===========================================

/**
 * Streak bonuses for consecutive weekly participation
 * Rewards loyalty and retention
 */
const TOURNAMENT_STREAKS = {
  // Streak milestones
  milestones: [
    {
      weeks: 2,
      essenceBonus: 0.05,  // +5% essence earned
      rewards: null,
      cosmetics: null
    },
    {
      weeks: 4,
      essenceBonus: 0.10,  // +10% essence earned
      rewards: { rollTickets: 3 },
      cosmetics: ['badge_streak_4']
    },
    {
      weeks: 8,
      essenceBonus: 0.15,  // +15% essence earned
      rewards: { rollTickets: 5, premiumTickets: 1 },
      cosmetics: ['badge_streak_8', 'frame_dedicated']
    },
    {
      weeks: 12,
      essenceBonus: 0.20,  // +20% essence earned
      rewards: { rollTickets: 10, premiumTickets: 3 },
      cosmetics: ['badge_streak_12', 'frame_veteran', 'title_tournament_veteran']
    }
  ],

  // Participation requirements to maintain streak
  minimumEssenceToMaintain: 10000000,  // 10M essence minimum

  // Grace period for missed weeks
  gracePeriodWeeks: 0,  // No grace period (miss a week, lose streak)

  // Maximum streak bonus cap
  maxEssenceBonus: 0.25  // Cap at 25% bonus
};

// ===========================================
// TOURNAMENT COSMETICS (NEW v4.0)
// ===========================================

/**
 * Tournament-exclusive cosmetic rewards
 * Creates prestige and visible achievement
 */
const TOURNAMENT_COSMETICS = {
  // Cosmetic types
  types: {
    AVATAR_FRAME: 'avatar_frame',
    PROFILE_TITLE: 'profile_title',
    TAP_SKIN: 'tap_skin',
    LEADERBOARD_FLAIR: 'leaderboard_flair',
    BADGE: 'badge'
  },

  // All available tournament cosmetics
  items: {
    // Champion rewards
    frame_champion_gold: {
      id: 'frame_champion_gold',
      type: 'avatar_frame',
      name: 'Champion\'s Laurel',
      description: 'Awarded to #1 tournament finisher',
      rarity: 'legendary',
      asset: '/frames/champion_gold.png'
    },
    title_weekly_champion: {
      id: 'title_weekly_champion',
      type: 'profile_title',
      name: 'Weekly Champion',
      description: 'Finished #1 in weekly tournament',
      rarity: 'legendary',
      displayText: 'Weekly Champion'
    },

    // Podium rewards
    frame_podium_silver: {
      id: 'frame_podium_silver',
      type: 'avatar_frame',
      name: 'Silver Podium',
      description: 'Finished 2nd in weekly tournament',
      rarity: 'epic',
      asset: '/frames/podium_silver.png'
    },
    frame_podium_bronze: {
      id: 'frame_podium_bronze',
      type: 'avatar_frame',
      name: 'Bronze Podium',
      description: 'Finished 3rd in weekly tournament',
      rarity: 'rare',
      asset: '/frames/podium_bronze.png'
    },

    // Top 10 badge
    badge_top_10: {
      id: 'badge_top_10',
      type: 'badge',
      name: 'Top 10',
      description: 'Finished in top 10 of tournament bracket',
      rarity: 'rare',
      asset: '/badges/top_10.png'
    },

    // Streak badges
    badge_streak_4: {
      id: 'badge_streak_4',
      type: 'badge',
      name: '4-Week Streak',
      description: 'Participated in 4 consecutive tournaments',
      rarity: 'uncommon',
      asset: '/badges/streak_4.png'
    },
    badge_streak_8: {
      id: 'badge_streak_8',
      type: 'badge',
      name: '8-Week Streak',
      description: 'Participated in 8 consecutive tournaments',
      rarity: 'rare',
      asset: '/badges/streak_8.png'
    },
    badge_streak_12: {
      id: 'badge_streak_12',
      type: 'badge',
      name: '12-Week Streak',
      description: 'Participated in 12 consecutive tournaments',
      rarity: 'epic',
      asset: '/badges/streak_12.png'
    },

    // Streak frames
    frame_dedicated: {
      id: 'frame_dedicated',
      type: 'avatar_frame',
      name: 'Dedicated Player',
      description: '8-week tournament streak achievement',
      rarity: 'rare',
      asset: '/frames/dedicated.png'
    },
    frame_veteran: {
      id: 'frame_veteran',
      type: 'avatar_frame',
      name: 'Tournament Veteran',
      description: '12-week tournament streak achievement',
      rarity: 'epic',
      asset: '/frames/veteran.png'
    },

    // Veteran title
    title_tournament_veteran: {
      id: 'title_tournament_veteran',
      type: 'profile_title',
      name: 'Tournament Veteran',
      description: '12-week tournament streak achievement',
      rarity: 'epic',
      displayText: 'Tournament Veteran'
    },

    // Bracket champion cosmetics (earned by winning your bracket)
    frame_bracket_champion: {
      id: 'frame_bracket_champion',
      type: 'avatar_frame',
      name: 'Bracket Champion',
      description: 'Won first place in your bracket',
      rarity: 'rare',
      asset: '/frames/bracket_champion.png'
    },

    // Tier achievement cosmetics
    title_champion_tier: {
      id: 'title_champion_tier',
      type: 'profile_title',
      name: 'Essence Champion',
      description: 'Reached Champion tier in tournament',
      rarity: 'legendary',
      displayText: 'Essence Champion'
    }
  }
};

// ===========================================
// UNDERDOG MECHANICS (NEW v4.0)
// ===========================================

/**
 * Comeback mechanics for players who fall behind
 * Keeps engagement for players not in the lead
 */
const UNDERDOG_MECHANICS = {
  // Catch-up bonus during final 48 hours
  finalPushBonus: {
    hoursBeforeEnd: 48,
    bottomPercentile: 50,  // Bottom 50% of bracket
    essenceBonus: 0.25     // +25% essence
  },

  // Welcome back bonus for returning players
  welcomeBackBonus: {
    daysInactive: 3,
    essenceBonus: 0.50,    // +50% essence for first session
    duration: 3600000      // Lasts 1 hour
  },

  // Never-won bonus (for players who never placed top 3)
  neverWonBonus: {
    essenceBonus: 0.10,    // +10% permanent until first podium
    enabled: true
  }
};

// ===========================================
// ADDITIONAL TICKET GENERATION (NEW)
// ===========================================

/**
 * Additional ways to earn roll tickets from Essence Tap
 * Balanced to provide ~5-10 tickets per day of active play
 */
const TICKET_GENERATION = {
  // Daily challenges that award tickets
  dailyTicketChallenges: [
    {
      id: 'daily_essence_50m',
      name: 'Daily Grinder',
      description: 'Earn 50,000,000 essence today',
      target: 50000000,  // v3.0: Was 5M
      reward: { rollTickets: 2 }
    },
    {
      id: 'daily_crits_250',
      name: 'Critical Expert',
      description: 'Land 250 critical clicks today',
      target: 250,
      reward: { rollTickets: 1 }
    },
    {
      id: 'daily_golden_5',
      name: 'Golden Hunter',
      description: 'Get 5 golden essence clicks today',
      target: 5,
      reward: { rollTickets: 2, premiumTickets: 1 }
    },
    {
      id: 'daily_generators_100',
      name: 'Empire Builder',
      description: 'Purchase 100 generators today',
      target: 100,
      reward: { rollTickets: 1 }
    }
  ],

  // Essence-to-ticket exchange (using golden essence)
  essenceExchange: {
    // Exchange rate: golden essence to roll tickets
    goldenToRoll: {
      cost: 10000,  // 10,000 golden essence
      tickets: 1
    },
    // Exchange rate: golden essence to premium tickets
    goldenToPremium: {
      cost: 50000,  // 50,000 golden essence
      tickets: 1
    },
    // Daily exchange limits
    dailyRollLimit: 5,
    dailyPremiumLimit: 2
  },

  // Streak bonuses for consecutive days of play
  streakTickets: {
    3: { rollTickets: 1 },   // 3-day streak
    7: { rollTickets: 3, premiumTickets: 1 },  // 7-day streak
    14: { rollTickets: 5, premiumTickets: 2 }, // 14-day streak
    30: { rollTickets: 10, premiumTickets: 5 } // 30-day streak
  },

  // Generator milestone tickets
  // v3.0 REBALANCING: Increased thresholds slightly
  generatorMilestones: [
    { totalGenerators: 150, reward: { rollTickets: 2 } },    // v3.0: Was 100
    { totalGenerators: 750, reward: { rollTickets: 5 } },    // v3.0: Was 500
    { totalGenerators: 2000, reward: { rollTickets: 10, premiumTickets: 2 } },  // v3.0: Was 1000
    { totalGenerators: 10000, reward: { rollTickets: 25, premiumTickets: 5 } }  // v3.0: Was 5000
  ],

  // Fate Point to Ticket exchange
  fatePointExchange: {
    cost: 50,           // 50 Fate Points per exchange
    tickets: 3,         // 3 roll tickets per exchange
    weeklyLimit: 5      // Max 5 exchanges per week
  },

  // Daily streak system
  dailyStreak: {
    // Ticket milestones for consecutive days played
    ticketMilestones: [
      { days: 3, tickets: 1 },
      { days: 7, tickets: 3 },
      { days: 14, tickets: 5 },
      { days: 30, tickets: 10 }
    ]
  },

  // Daily challenge ticket limits
  dailyChallenges: {
    maxPerDay: 3  // Max ticket rewards from daily challenges per day
  }
};

// ===========================================
// UTILITIES
// ===========================================

/**
 * Element derivation utility
 * Import from calculations/utils.js for the deriveElement function
 */
const { deriveElement } = require('../services/essenceTap/calculations/utils');

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  // Generators and upgrades
  GENERATORS,
  CLICK_UPGRADES,
  GENERATOR_UPGRADES,
  GLOBAL_UPGRADES,
  SYNERGY_UPGRADES,

  // Prestige system
  PRESTIGE_CONFIG,

  // Core game config
  GAME_CONFIG,

  // NEW: Character mastery
  CHARACTER_MASTERY,

  // NEW: Essence types
  ESSENCE_TYPES,
  ESSENCE_REQUIREMENTS,

  // NEW: Series synergies
  SERIES_SYNERGIES,

  // Fate points integration
  FATE_POINT_MILESTONES,
  REPEATABLE_MILESTONES,
  PRESTIGE_FATE_REWARDS,
  WEEKLY_FP_CAP,

  // Mini-milestones for mobile sessions
  MINI_MILESTONES,

  // XP rewards
  XP_REWARDS,

  // Challenges
  DAILY_CHALLENGES,

  // Character abilities
  CHARACTER_ABILITIES,
  ELEMENT_SYNERGIES,

  // Daily modifiers
  DAILY_MODIFIERS,

  // Active abilities
  ACTIVE_ABILITIES,

  // Risk/reward mechanics
  GAMBLE_CONFIG,
  INFUSION_CONFIG,

  // Weekly tournament (v4.0 Enhanced)
  WEEKLY_TOURNAMENT,
  RANK_REWARDS,
  BRACKET_SYSTEM,
  DAILY_CHECKPOINTS,
  BURNING_HOURS,
  TOURNAMENT_STREAKS,
  TOURNAMENT_COSMETICS,
  UNDERDOG_MECHANICS,

  // Ticket generation
  TICKET_GENERATION,

  // Element derivation utility (re-exported from calculations/utils)
  deriveElement
};
