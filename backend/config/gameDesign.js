/**
 * Game Design Configuration
 *
 * Centralized configuration for game systems based on the comprehensive
 * game design document. This file contains constants and configurations
 * for the enhanced Dojo, Fishing, Gacha, and Retention systems.
 */

// ===========================================
// DOJO ENHANCEMENTS
// ===========================================

const DOJO_SPECIALIZATIONS = {
  // Each character can choose ONE specialization path (permanent)
  strength: {
    id: 'strength',
    name: 'Path of Strength',
    description: 'Focused on combat power and fishing strength',
    icon: 'sword',
    bonuses: {
      dojoPointsMultiplier: 1.0,    // No change to dojo income
      fishingPowerBonus: 0.15,      // +15% fishing power vs large fish
      gachaLuckBonus: 0,
      currencyBonus: 0,
      synergyBonus: 0
    }
  },
  wisdom: {
    id: 'wisdom',
    name: 'Path of Wisdom',
    description: 'Enhanced learning and gacha fortune',
    icon: 'book',
    bonuses: {
      dojoPointsMultiplier: 0.5,    // -50% dojo income
      fishingPowerBonus: 0,
      gachaLuckBonus: 0.05,         // +5% gacha luck
      xpMultiplier: 1.5,            // +50% XP gains
      currencyBonus: 0,
      synergyBonus: 0
    }
  },
  spirit: {
    id: 'spirit',
    name: 'Path of Spirit',
    description: 'Currency generation and team harmony',
    icon: 'sparkle',
    bonuses: {
      dojoPointsMultiplier: 1.25,   // +25% dojo income
      fishingPowerBonus: 0,
      gachaLuckBonus: 0,
      currencyBonus: 0.1,           // +10% currency from all sources
      synergyBonus: 0.1             // +10% team synergy effectiveness
    }
  }
};

const DOJO_FACILITY_TIERS = {
  basic: {
    id: 'basic',
    name: 'Basic Dojo',
    requiredLevel: 0,
    maxSlots: 3,
    features: ['basic_training'],
    unlockCost: 0,
    description: 'A simple training ground'
  },
  warriors_hall: {
    id: 'warriors_hall',
    name: "Warrior's Hall",
    requiredLevel: 10,
    maxSlots: 5,
    features: ['basic_training', 'specializations'],
    unlockCost: 5000,
    description: 'Introduces specialization paths'
  },
  masters_temple: {
    id: 'masters_temple',
    name: "Master's Temple",
    requiredLevel: 25,
    maxSlots: 7,
    features: ['basic_training', 'specializations', 'synergy_training', 'breakthroughs'],
    unlockCost: 25000,
    description: 'Synergy bonuses and breakthrough discoveries'
  },
  grandmasters_sanctum: {
    id: 'grandmasters_sanctum',
    name: "Grandmaster's Sanctum",
    requiredLevel: 50,
    maxSlots: 10,
    features: ['basic_training', 'specializations', 'synergy_training', 'breakthroughs', 'legacy_training'],
    unlockCost: 100000,
    description: 'Legacy training and legendary discoveries'
  }
};

const DOJO_TRAINING_METHODS = {
  standard: {
    id: 'standard',
    name: 'Standard Training',
    description: 'Balanced training with normal rewards',
    duration: null, // Continuous
    xpMultiplier: 1.0,
    pointsMultiplier: 1.0,
    characterAvailable: true // Can still be used for fishing
  },
  intense: {
    id: 'intense',
    name: 'Intense Training',
    description: '2x XP but character unavailable for 4 hours',
    duration: 4 * 60 * 60 * 1000, // 4 hours in ms
    xpMultiplier: 2.0,
    pointsMultiplier: 1.5,
    characterAvailable: false
  },
  meditation: {
    id: 'meditation',
    name: 'Meditation',
    description: 'Slower XP but generates premium currency',
    duration: null,
    xpMultiplier: 0.5,
    pointsMultiplier: 0.5,
    premiumCurrencyChance: 0.02, // 2% per hour
    characterAvailable: true
  },
  sparring: {
    id: 'sparring',
    name: 'Sparring',
    description: 'Requires 2 characters, both get 1.5x rewards',
    duration: null,
    xpMultiplier: 1.5,
    pointsMultiplier: 1.5,
    requiresPartner: true,
    characterAvailable: true
  }
};

const DOJO_BREAKTHROUGH_CONFIG = {
  // Base chance per hour of training
  baseChancePerHour: 0.02, // 2% per hour

  // Multipliers by rarity
  rarityMultipliers: {
    common: 0.5,
    uncommon: 0.75,
    rare: 1.0,
    epic: 1.25,
    legendary: 1.5
  },

  // Breakthrough types and their rewards
  types: {
    skill_discovery: {
      weight: 40,
      name: 'Skill Discovery',
      description: 'Discovered a new technique!',
      rewards: { xpBonus: 500 }
    },
    hidden_treasure: {
      weight: 30,
      name: 'Hidden Treasure',
      description: 'Found a hidden cache of resources!',
      rewards: { pointsBonus: 1000 }
    },
    moment_of_clarity: {
      weight: 20,
      name: 'Moment of Clarity',
      description: 'Achieved enlightenment!',
      rewards: { rollTickets: 1 }
    },
    legendary_insight: {
      weight: 10,
      name: 'Legendary Insight',
      description: 'A rare and powerful discovery!',
      rewards: { premiumTickets: 1, xpBonus: 1000 }
    }
  }
};

// ===========================================
// FISHING ENHANCEMENTS
// ===========================================

const FISHING_BAIT_SYSTEM = {
  none: {
    id: 'none',
    name: 'No Bait',
    description: 'Fish with no bait - standard rates',
    cost: 0,
    costType: null,
    rarityBonus: 0,
    catchRateBonus: 0,
    consumable: false
  },
  basic_bait: {
    id: 'basic_bait',
    name: 'Basic Bait',
    description: 'Slightly improved catch rates',
    cost: 10,
    costType: 'points',
    rarityBonus: 0,
    catchRateBonus: 0.1, // +10% catch window
    consumable: true
  },
  quality_bait: {
    id: 'quality_bait',
    name: 'Quality Bait',
    description: 'Better fish are more likely to appear',
    cost: 50,
    costType: 'points',
    rarityBonus: 0.1, // +10% rare+ chance
    catchRateBonus: 0.05,
    consumable: true
  },
  premium_bait: {
    id: 'premium_bait',
    name: 'Premium Bait',
    description: 'Guaranteed rare or better',
    cost: 1,
    costType: 'rollTickets',
    rarityBonus: 0.5, // +50% rare+ chance
    catchRateBonus: 0.15,
    guaranteedMinRarity: 'rare',
    consumable: true
  },
  legendary_bait: {
    id: 'legendary_bait',
    name: 'Legendary Lure',
    description: 'Attracts the rarest fish',
    cost: 1,
    costType: 'premiumTickets',
    rarityBonus: 1.0, // +100% rare+ chance
    catchRateBonus: 0.2,
    legendaryBonus: 0.1, // +10% legendary specifically
    consumable: true
  },
  event_bait: {
    id: 'event_bait',
    name: 'Event Bait',
    description: 'Special event-only bait',
    cost: 0,
    costType: null,
    rarityBonus: 0.25,
    catchRateBonus: 0.1,
    eventOnly: true,
    consumable: true
  }
};

const FISHING_DOUBLE_OR_NOTHING = {
  enabled: true,
  minRarity: 'rare', // Only available for rare+ catches

  // Risk/reward by rarity
  tiers: {
    rare: {
      successChance: 0.55, // 55% success
      sizeMultiplier: 1.5, // 50% bigger on success
      bonusReward: 100     // Extra points on success
    },
    epic: {
      successChance: 0.50, // 50% success
      sizeMultiplier: 1.75,
      bonusReward: 300
    },
    legendary: {
      successChance: 0.45, // 45% success
      sizeMultiplier: 2.0, // Double size on success
      bonusReward: 1000
    }
  },

  // Consolation on failure
  failureReward: {
    scales: true, // Fish drops scales/materials on escape
    scaleMultiplier: 0.3 // Get 30% of fish value as materials
  }
};

const FISHING_VISUAL_RARITY_CONFIG = {
  // Visual cues by rarity tier
  common: {
    splashSize: 'small',
    glowIntensity: 0,
    screenShake: false,
    musicChange: false,
    silhouettePreview: false,
    celebrationLevel: 1
  },
  uncommon: {
    splashSize: 'medium',
    glowIntensity: 0.2,
    glowColor: '#4CAF50', // Green
    screenShake: false,
    musicChange: false,
    silhouettePreview: false,
    celebrationLevel: 2
  },
  rare: {
    splashSize: 'large',
    glowIntensity: 0.5,
    glowColor: '#2196F3', // Blue
    screenShake: true,
    shakeIntensity: 'light',
    musicChange: true,
    silhouettePreview: false,
    celebrationLevel: 3
  },
  epic: {
    splashSize: 'very_large',
    glowIntensity: 0.8,
    glowColor: '#9C27B0', // Purple
    screenShake: true,
    shakeIntensity: 'medium',
    musicChange: true,
    silhouettePreview: true,
    celebrationLevel: 4
  },
  legendary: {
    splashSize: 'massive',
    glowIntensity: 1.0,
    glowColor: '#FFD700', // Gold
    screenShake: true,
    shakeIntensity: 'heavy',
    musicChange: true,
    warningIndicator: true, // "!" appears before bite
    silhouettePreview: true,
    cinematicCamera: true,
    celebrationLevel: 5
  }
};

// ===========================================
// GACHA ENHANCEMENTS
// ===========================================

const GACHA_MILESTONE_REWARDS = {
  // Rewards given at specific pull counts (per banner)
  milestones: [
    { pulls: 10, reward: { type: 'bait', id: 'premium_bait', quantity: 5 } },
    { pulls: 30, reward: { type: 'rod_skin', id: 'starlight_rod' } },
    { pulls: 50, reward: { type: 'character_selector', rarity: 'rare' } },
    { pulls: 80, reward: { type: 'bait', id: 'legendary_bait', quantity: 3 } },
    { pulls: 100, reward: { type: 'character_selector', rarity: 'epic' } },
    { pulls: 150, reward: { type: 'premium_tickets', quantity: 10 } },
    { pulls: 200, reward: { type: 'character_selector', rarity: 'legendary' } }
  ]
};

const GACHA_FATE_POINTS = {
  enabled: true,

  // Points earned per pull type
  pointsPerPull: {
    standard: 1,
    banner: 2,
    premium: 3
  },

  // Rate-up banner specific
  rateUpBanner: {
    // When you pull a non-featured 5-star, earn fate points
    nonFeaturedFiveStarPoints: 1,

    // Points needed for guaranteed featured character
    pointsForGuaranteed: 2
  }
};

const GACHA_ALTERNATIVE_PATHS = {
  // Alternative ways to obtain characters without pure gacha

  fishingPath: {
    enabled: true,
    description: 'Legendary fish can BE characters',
    // Mapping of legendary fish to potential character unlocks
    // (Actual mappings would be data-driven)
    catchToCharacterChance: 0.01, // 1% chance legendary fish unlocks a character
    eligibleFish: ['whale', 'kraken', 'dragon']
  },

  dojoPath: {
    enabled: true,
    description: 'Wandering Warriors visit after 30 days',
    wanderingWarriorDays: 30,
    choicesOffered: 3, // Player picks from 3 options
    recruitCostMultiplier: 5000 // Legacy tokens per character
  },

  achievementPath: {
    enabled: true,
    description: 'Major achievements unlock character selectors',
    // Defined in MASTERY_TRACKS below
  }
};

// ===========================================
// RETENTION SYSTEMS
// ===========================================

const WEEKLY_VOYAGE_CONFIG = {
  // Weekly themed objective sets
  duration: 7 * 24 * 60 * 60 * 1000, // 7 days in ms

  chapterStructure: {
    chapter1: { days: [1, 2] },
    chapter2: { days: [3, 4] },
    chapter3: { days: [5, 6, 7] }
  },

  // Template voyage types
  voyageTypes: [
    {
      id: 'deep_expedition',
      name: 'The Deep Expedition',
      theme: 'ocean',
      chapters: [
        { objective: 'catch_deep_water', target: 5, description: 'Catch 5 deep-water fish' },
        { objective: 'train_character', target: 1, description: 'Train a character to new level' },
        { objective: 'catch_weekly_legendary', target: 1, description: 'Catch the Weekly Legendary' }
      ],
      rewards: {
        chapter1: { spiritEssence: 500 },
        chapter2: { item: 'premium_training_scroll' },
        chapter3: { weeklyBannerTicket: 1 },
        complete: { voyageChest: 1 }
      }
    },
    {
      id: 'masters_journey',
      name: "Master's Journey",
      theme: 'dojo',
      chapters: [
        { objective: 'claim_dojo_rewards', target: 5, description: 'Claim Dojo rewards 5 times' },
        { objective: 'breakthrough_discovery', target: 1, description: 'Achieve a training breakthrough' },
        { objective: 'synergy_bonus', target: 3, description: 'Earn synergy bonuses from 3 series' }
      ],
      rewards: {
        chapter1: { points: 1000 },
        chapter2: { rollTickets: 3 },
        chapter3: { premiumTickets: 1 },
        complete: { voyageChest: 1 }
      }
    },
    {
      id: 'collectors_quest',
      name: "Collector's Quest",
      theme: 'gacha',
      chapters: [
        { objective: 'gacha_pulls', target: 10, description: 'Perform 10 gacha pulls' },
        { objective: 'new_character', target: 1, description: 'Obtain a new character' },
        { objective: 'level_up_character', target: 3, description: 'Level up 3 characters' }
      ],
      rewards: {
        chapter1: { rollTickets: 2 },
        chapter2: { points: 2000 },
        chapter3: { characterSelector: 'rare' },
        complete: { voyageChest: 1 }
      }
    }
  ]
};

const DAILY_ACTIVITY_MENU = {
  // Players choose activities to complete for daily bonus
  requiredActivities: 3, // Complete any 3 for daily bonus

  activities: [
    { id: 'collect_dojo', name: 'Collect Dojo rewards', weight: 1 },
    { id: 'catch_10_fish', name: 'Catch 10 fish', weight: 1 },
    { id: 'complete_training', name: 'Complete 1 training session', weight: 1 },
    { id: 'catch_each_element', name: 'Catch a fish of each rarity', weight: 2 },
    { id: 'perfect_catch', name: 'Score a "Perfect Catch"', weight: 1 },
    { id: 'discover_species', name: 'Discover a new fish species', weight: 2 },
    { id: 'upgrade_facility', name: 'Upgrade any facility', weight: 2 },
    { id: 'trade_fish', name: 'Release fish worth 100+ essence', weight: 1 }
  ],

  // Bonus objectives for extra rewards
  bonusObjectives: [
    { id: 'catch_rare', name: 'Catch a Rare+ fish', bonusMultiplier: 1.5 },
    { id: 'daily_training', name: "Complete a character's daily training", bonusMultiplier: 1.5 }
  ],

  dailyBonus: {
    points: 200,
    rollTickets: 1
  },

  bonusReward: {
    points: 100,
    premiumTickets: 0 // Only from special activities
  }
};

const MASTERY_TRACKS = {
  // Character mastery progression
  characterMastery: {
    maxLevel: 10,
    levels: [
      { level: 1, requirement: 0, reward: null, description: 'Character unlocked' },
      { level: 2, requirement: 100, reward: { points: 100 } },
      { level: 3, requirement: 300, reward: { cosmetic: 'alternate_costume_preview' } },
      { level: 4, requirement: 600, reward: { points: 250 } },
      { level: 5, requirement: 1000, reward: { cosmetic: 'unique_fishing_rod' } },
      { level: 6, requirement: 1500, reward: { points: 500 } },
      { level: 7, requirement: 2200, reward: { story: 'backstory_chapter' } },
      { level: 8, requirement: 3000, reward: { points: 750 } },
      { level: 9, requirement: 4000, reward: { premiumTickets: 1 } },
      { level: 10, requirement: 5500, reward: { cosmetic: 'true_form_visual' } }
    ],

    // XP sources
    xpSources: {
      dojoTraining: 10,      // Per hour
      fishingWithCharacter: 5, // Per catch when character is "equipped"
      storyCompletion: 100,
      achievementCompletion: 50
    }
  },

  // Fish collection mastery
  fishCodex: {
    totalSpecies: 300, // Target species count

    milestones: [
      { count: 50, reward: { title: 'Budding Naturalist', rod: 'naturalist_rod' } },
      { count: 100, reward: { title: 'Ichthyologist', baitRecipe: 'rare_bait' } },
      { count: 150, reward: { title: 'Expert Ichthyologist', premiumTickets: 5 } },
      { count: 200, reward: { title: 'Marine Biologist', characterSelector: 'epic' } },
      { count: 250, reward: { title: 'Legendary Naturalist', premiumTickets: 10 } },
      { count: 300, reward: { title: 'Legendary Angler', exclusiveCharacter: true } }
    ],

    // Biome completion bonuses
    biomes: {
      pond: { bonus: 'pond_master_rod', requiredCompletion: 1.0 },
      river: { bonus: 'river_master_rod', requiredCompletion: 1.0 },
      ocean: { bonus: 'ocean_master_rod', requiredCompletion: 1.0 },
      abyss: { bonus: 'abyss_master_rod', requiredCompletion: 1.0 }
    }
  }
};

// ===========================================
// REWARD PSYCHOLOGY
// ===========================================

const REST_AND_RETURN_BONUS = {
  enabled: true,

  // Bonus tiers based on absence duration
  tiers: [
    { minDays: 2, maxDays: 3, bonus: { points: 500, message: 'Welcome back! Here\'s a small bonus.' } },
    { minDays: 4, maxDays: 7, bonus: { points: 1500, rollTickets: 2, message: 'We missed you! Enjoy these rewards.' } },
    { minDays: 8, maxDays: 14, bonus: { points: 3000, rollTickets: 5, premiumTickets: 1, message: 'Great to see you again! Here\'s a welcome back gift.' } },
    { minDays: 15, maxDays: 30, bonus: { points: 5000, rollTickets: 10, premiumTickets: 3, message: 'It\'s been a while! We prepared something special.' } },
    { minDays: 31, maxDays: Infinity, bonus: { points: 10000, rollTickets: 20, premiumTickets: 5, characterSelector: 'rare', message: 'Welcome home! Here\'s everything you need to catch up.' } }
  ],

  // Dojo catch-up (accumulated rewards don't decay completely)
  dojoCatchUp: {
    enabled: true,
    maxAccumulatedDays: 7, // Cap at 7 days worth
    efficiencyDecay: 0.8   // 80% efficiency for offline rewards beyond cap
  }
};

const STREAK_INSURANCE = {
  enabled: true,

  // Bad luck builds up hidden "luck meter"
  luckMeter: {
    perFailedCatch: 2,      // +2% luck per miss
    perCommonCatch: 0.5,    // +0.5% luck per common (when hoping for rare)
    maxAccumulated: 50,     // Caps at +50%
    decayPerDay: 10,        // Lose 10% per day of good luck
    applyTo: ['fishing', 'gacha']
  },

  // Consolation rewards
  consolation: {
    fishEscape: {
      enabled: true,
      reward: 'scales', // Fish drops scales even on escape
      valueMultiplier: 0.2 // 20% of fish value
    },
    gachaCommon: {
      enabled: true,
      bonusCurrency: 10 // Extra currency per common pull
    }
  }
};

const CHECK_IN_EFFICIENCY = {
  // Reward efficiency based on check-in interval
  // Designed to not punish players for having lives
  intervals: [
    { hours: 2, efficiency: 1.0, description: 'Optimal' },
    { hours: 4, efficiency: 0.95, description: 'Great' },
    { hours: 8, efficiency: 0.85, description: 'Good' },
    { hours: 12, efficiency: 0.70, description: 'Okay' },
    { hours: 24, efficiency: 0.50, description: 'Some decay' }
    // After 24h, rest-and-return bonuses kick in
  ],

  // Never zero - always some reward
  minimumEfficiency: 0.25
};

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  // Dojo
  DOJO_SPECIALIZATIONS,
  DOJO_FACILITY_TIERS,
  DOJO_TRAINING_METHODS,
  DOJO_BREAKTHROUGH_CONFIG,

  // Fishing
  FISHING_BAIT_SYSTEM,
  FISHING_DOUBLE_OR_NOTHING,
  FISHING_VISUAL_RARITY_CONFIG,

  // Gacha
  GACHA_MILESTONE_REWARDS,
  GACHA_FATE_POINTS,
  GACHA_ALTERNATIVE_PATHS,

  // Retention
  WEEKLY_VOYAGE_CONFIG,
  DAILY_ACTIVITY_MENU,
  MASTERY_TRACKS,

  // Psychology
  REST_AND_RETURN_BONUS,
  STREAK_INSURANCE,
  CHECK_IN_EFFICIENCY
};
