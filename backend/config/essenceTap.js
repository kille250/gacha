/**
 * Essence Tap Clicker Game Configuration
 *
 * This file defines all balancing constants for the Essence Tap minigame.
 * The game is an idle/incremental clicker where players tap to generate essence,
 * purchase generators for passive income, and prestige for permanent multipliers.
 *
 * BALANCE PHILOSOPHY:
 * - First upgrade purchasable within 10-15 seconds of clicking
 * - New generator tier unlockable every 2-5 minutes early game
 * - Prestige viable after ~1-2 hours of play
 * - Character bonuses impactful but not mandatory
 * - Offline gains ~50% of active play efficiency
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
    baseOutput: 1,           // Essence per second per generator
    baseCost: 15,            // Initial purchase cost
    costMultiplier: 1.15,    // Cost increase per purchase
    unlockEssence: 0,        // Essence required to unlock (0 = available immediately)
    icon: 'sprite',
    tier: 1
  },
  {
    id: 'mana_well',
    name: 'Mana Well',
    description: 'A mystical well that draws essence from the earth',
    baseOutput: 8,
    baseCost: 100,
    costMultiplier: 1.15,
    unlockEssence: 50,
    icon: 'well',
    tier: 2
  },
  {
    id: 'crystal_node',
    name: 'Crystal Node',
    description: 'Crystalline formation resonating with magical energy',
    baseOutput: 47,
    baseCost: 1100,
    costMultiplier: 1.15,
    unlockEssence: 500,
    icon: 'crystal',
    tier: 3
  },
  {
    id: 'arcane_altar',
    name: 'Arcane Altar',
    description: 'Ancient altar channeling pure arcane power',
    baseOutput: 260,
    baseCost: 12000,
    costMultiplier: 1.15,
    unlockEssence: 5000,
    icon: 'altar',
    tier: 4
  },
  {
    id: 'spirit_beacon',
    name: 'Spirit Beacon',
    description: 'A beacon that attracts wandering spirits',
    baseOutput: 1400,
    baseCost: 130000,
    costMultiplier: 1.15,
    unlockEssence: 50000,
    icon: 'beacon',
    tier: 5
  },
  {
    id: 'void_rift',
    name: 'Void Rift',
    description: 'A tear in reality leaking pure essence',
    baseOutput: 7800,
    baseCost: 1400000,
    costMultiplier: 1.15,
    unlockEssence: 500000,
    icon: 'rift',
    tier: 6
  },
  {
    id: 'celestial_gate',
    name: 'Celestial Gate',
    description: 'A gateway to the celestial realm of infinite essence',
    baseOutput: 44000,
    baseCost: 20000000,
    costMultiplier: 1.15,
    unlockEssence: 5000000,
    icon: 'gate',
    tier: 7
  },
  {
    id: 'eternal_nexus',
    name: 'Eternal Nexus',
    description: 'The convergence point of all magical energies',
    baseOutput: 260000,
    baseCost: 330000000,
    costMultiplier: 1.15,
    unlockEssence: 50000000,
    icon: 'nexus',
    tier: 8
  },
  {
    id: 'primordial_core',
    name: 'Primordial Core',
    description: 'The heart of creation itself',
    baseOutput: 1600000,
    baseCost: 5100000000,
    costMultiplier: 1.15,
    unlockEssence: 500000000,
    icon: 'core',
    tier: 9
  },
  {
    id: 'infinity_engine',
    name: 'Infinity Engine',
    description: 'A machine that generates essence from nothing',
    baseOutput: 10000000,
    baseCost: 75000000000,
    costMultiplier: 1.15,
    unlockEssence: 5000000000,
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
    description: '+1 essence per click',
    type: 'click_power',
    bonus: 1,
    cost: 100,
    unlockEssence: 0,
    tier: 1
  },
  {
    id: 'click_power_2',
    name: 'Empowered Tap',
    description: '+2 essence per click',
    type: 'click_power',
    bonus: 2,
    cost: 500,
    unlockEssence: 200,
    tier: 2
  },
  {
    id: 'click_power_3',
    name: 'Mighty Tap',
    description: '+5 essence per click',
    type: 'click_power',
    bonus: 5,
    cost: 5000,
    unlockEssence: 2000,
    tier: 3
  },
  {
    id: 'click_power_4',
    name: 'Devastating Tap',
    description: '+15 essence per click',
    type: 'click_power',
    bonus: 15,
    cost: 50000,
    unlockEssence: 20000,
    tier: 4
  },
  {
    id: 'click_power_5',
    name: 'Legendary Tap',
    description: '+50 essence per click',
    type: 'click_power',
    bonus: 50,
    cost: 500000,
    unlockEssence: 200000,
    tier: 5
  },
  {
    id: 'crit_chance_1',
    name: 'Lucky Strike',
    description: '+5% critical click chance',
    type: 'crit_chance',
    bonus: 0.05,
    cost: 1000,
    unlockEssence: 500,
    tier: 1
  },
  {
    id: 'crit_chance_2',
    name: 'Fortune\'s Favor',
    description: '+5% critical click chance',
    type: 'crit_chance',
    bonus: 0.05,
    cost: 10000,
    unlockEssence: 5000,
    tier: 2
  },
  {
    id: 'crit_chance_3',
    name: 'Blessed Strikes',
    description: '+10% critical click chance',
    type: 'crit_chance',
    bonus: 0.10,
    cost: 100000,
    unlockEssence: 50000,
    tier: 3
  },
  {
    id: 'crit_mult_1',
    name: 'Critical Mastery',
    description: '+5x critical multiplier',
    type: 'crit_multiplier',
    bonus: 5,
    cost: 5000,
    unlockEssence: 2000,
    tier: 1
  },
  {
    id: 'crit_mult_2',
    name: 'Devastating Criticals',
    description: '+10x critical multiplier',
    type: 'crit_multiplier',
    bonus: 10,
    cost: 50000,
    unlockEssence: 20000,
    tier: 2
  },
  {
    id: 'crit_mult_3',
    name: 'Legendary Criticals',
    description: '+25x critical multiplier',
    type: 'crit_multiplier',
    bonus: 25,
    cost: 500000,
    unlockEssence: 200000,
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
    cost: 1000,
    requiredOwned: 10
  },
  {
    id: 'sprite_boost_2',
    name: 'Sprite Mastery',
    description: 'Essence Sprites produce 2x essence',
    generatorId: 'essence_sprite',
    multiplier: 2,
    cost: 50000,
    requiredOwned: 50
  },
  {
    id: 'well_boost_1',
    name: 'Deep Wells',
    description: 'Mana Wells produce 2x essence',
    generatorId: 'mana_well',
    multiplier: 2,
    cost: 10000,
    requiredOwned: 10
  },
  {
    id: 'well_boost_2',
    name: 'Bottomless Wells',
    description: 'Mana Wells produce 2x essence',
    generatorId: 'mana_well',
    multiplier: 2,
    cost: 500000,
    requiredOwned: 50
  },
  {
    id: 'crystal_boost_1',
    name: 'Crystal Resonance',
    description: 'Crystal Nodes produce 2x essence',
    generatorId: 'crystal_node',
    multiplier: 2,
    cost: 100000,
    requiredOwned: 10
  },
  {
    id: 'altar_boost_1',
    name: 'Altar Consecration',
    description: 'Arcane Altars produce 2x essence',
    generatorId: 'arcane_altar',
    multiplier: 2,
    cost: 1000000,
    requiredOwned: 10
  },
  {
    id: 'beacon_boost_1',
    name: 'Spirit Calling',
    description: 'Spirit Beacons produce 2x essence',
    generatorId: 'spirit_beacon',
    multiplier: 2,
    cost: 10000000,
    requiredOwned: 10
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
    cost: 10000,
    unlockEssence: 5000
  },
  {
    id: 'global_mult_2',
    name: 'Essence Mastery',
    description: '+25% to all essence production',
    type: 'global_multiplier',
    multiplier: 1.25,
    cost: 100000,
    unlockEssence: 50000
  },
  {
    id: 'global_mult_3',
    name: 'Essence Dominion',
    description: '+50% to all essence production',
    type: 'global_multiplier',
    multiplier: 1.50,
    cost: 1000000,
    unlockEssence: 500000
  },
  {
    id: 'global_mult_4',
    name: 'Essence Supremacy',
    description: '+100% to all essence production',
    type: 'global_multiplier',
    multiplier: 2.0,
    cost: 10000000,
    unlockEssence: 5000000
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
    cost: 50000,
    unlockEssence: 20000
  },
  {
    id: 'synergy_well_crystal',
    name: 'Well-Crystal Flow',
    description: 'Each Mana Well boosts Crystal Nodes by 1%',
    sourceGenerator: 'mana_well',
    targetGenerator: 'crystal_node',
    bonusPerSource: 0.01,
    cost: 500000,
    unlockEssence: 200000
  },
  {
    id: 'synergy_crystal_altar',
    name: 'Crystal-Altar Resonance',
    description: 'Each Crystal Node boosts Arcane Altars by 1%',
    sourceGenerator: 'crystal_node',
    targetGenerator: 'arcane_altar',
    bonusPerSource: 0.01,
    cost: 5000000,
    unlockEssence: 2000000
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
  minimumEssence: 1000000,

  // Formula for awakening shards: floor(sqrt(lifetimeEssence / divisor))
  shardDivisor: 1000000,

  // Shards provide permanent multiplier: 1 + (shards * shardMultiplier)
  shardMultiplier: 0.01,

  // Maximum shards (soft cap)
  maxEffectiveShards: 1000,

  // Prestige upgrades purchasable with shards
  upgrades: [
    {
      id: 'prestige_click',
      name: 'Awakened Tap',
      description: 'Permanent +2 click power per level',
      type: 'click_power',
      bonusPerLevel: 2,
      maxLevel: 50,
      baseCost: 1,
      costMultiplier: 1.5
    },
    {
      id: 'prestige_crit',
      name: 'Awakened Fortune',
      description: 'Permanent +1% crit chance per level',
      type: 'crit_chance',
      bonusPerLevel: 0.01,
      maxLevel: 30,
      baseCost: 2,
      costMultiplier: 1.8
    },
    {
      id: 'prestige_production',
      name: 'Awakened Flow',
      description: 'Permanent +5% production per level',
      type: 'production',
      bonusPerLevel: 0.05,
      maxLevel: 100,
      baseCost: 3,
      costMultiplier: 1.4
    },
    {
      id: 'prestige_offline',
      name: 'Awakened Dreams',
      description: 'Permanent +5% offline efficiency per level',
      type: 'offline',
      bonusPerLevel: 0.05,
      maxLevel: 20,
      baseCost: 5,
      costMultiplier: 2.0
    },
    {
      id: 'prestige_starting',
      name: 'Awakened Beginning',
      description: 'Start with bonus essence after prestige',
      type: 'starting_essence',
      bonusPerLevel: 1000,
      maxLevel: 100,
      baseCost: 2,
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

  // Combo system
  comboDecayTime: 1000,      // ms before combo resets
  maxComboMultiplier: 2.0,   // Max combo bonus
  comboGrowthRate: 0.1,      // Multiplier increase per click

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

  // Maximum assigned characters for bonus
  maxAssignedCharacters: 5,

  // Golden essence events
  goldenEssenceChance: 0.001,    // 0.1% chance per click
  goldenEssenceMultiplier: 100,  // 100x the normal click value

  // Auto-save interval (ms)
  autoSaveInterval: 30000
};

// ===========================================
// FATE POINTS INTEGRATION
// ===========================================

/**
 * Milestones that reward Fate Points
 */
const FATE_POINT_MILESTONES = [
  { lifetimeEssence: 1000000, fatePoints: 5, claimed: false },
  { lifetimeEssence: 10000000, fatePoints: 10, claimed: false },
  { lifetimeEssence: 100000000, fatePoints: 20, claimed: false },
  { lifetimeEssence: 1000000000, fatePoints: 50, claimed: false },
  { lifetimeEssence: 10000000000, fatePoints: 100, claimed: false }
];

/**
 * Prestige rewards Fate Points
 */
const PRESTIGE_FATE_REWARDS = {
  firstPrestige: 25,
  perPrestige: 10,
  maxPrestigeRewards: 10  // After 10 prestiges, no more FP from prestige
};

// ===========================================
// PROFILE XP INTEGRATION
// ===========================================

/**
 * XP earned from clicker activities
 */
const XP_REWARDS = {
  // XP per million essence earned (lifetime)
  perMillionEssence: 5,

  // XP for purchasing upgrades
  perUpgrade: 2,

  // XP for prestige
  perPrestige: 50,

  // Daily essence goals
  dailyGoals: [
    { essence: 100000, xp: 10 },
    { essence: 1000000, xp: 25 },
    { essence: 10000000, xp: 50 }
  ]
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
    rewards: { essence: 10000, fatePoints: 2 }
  },
  {
    id: 'clicks_5000',
    name: 'Tireless Tapper',
    description: 'Click 5,000 times',
    type: 'clicks',
    target: 5000,
    rewards: { essence: 50000, fatePoints: 5 }
  },
  {
    id: 'earn_million',
    name: 'Essence Collector',
    description: 'Earn 1,000,000 essence today',
    type: 'essence_earned',
    target: 1000000,
    rewards: { fatePoints: 3, rollTickets: 1 }
  },
  {
    id: 'crits_100',
    name: 'Critical Master',
    description: 'Land 100 critical clicks',
    type: 'crits',
    target: 100,
    rewards: { essence: 25000, fatePoints: 3 }
  },
  {
    id: 'buy_generators',
    name: 'Builder',
    description: 'Purchase 50 generators',
    type: 'generators_bought',
    target: 50,
    rewards: { essence: 100000 }
  }
];

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  GENERATORS,
  CLICK_UPGRADES,
  GENERATOR_UPGRADES,
  GLOBAL_UPGRADES,
  SYNERGY_UPGRADES,
  PRESTIGE_CONFIG,
  GAME_CONFIG,
  FATE_POINT_MILESTONES,
  PRESTIGE_FATE_REWARDS,
  XP_REWARDS,
  DAILY_CHALLENGES
};
