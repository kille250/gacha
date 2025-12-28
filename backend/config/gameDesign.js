/**
 * Game Design Configuration
 *
 * Centralized configuration for game systems based on the comprehensive
 * game design document. This file contains constants and configurations
 * for the enhanced Dojo, Fishing, Gacha, and Retention systems.
 *
 * ============================================================================
 * BALANCE UPDATE (v5.0 - Ultimate Mode Balancing)
 * ============================================================================
 * Key changes in v5.0:
 *
 * 1. GACHA MILESTONE REWARDS BUFFED: Better progression incentives
 *    - Pull milestones now award XP in addition to items
 *    - New milestone at 350 pulls
 *    - Fate point exchange costs reduced
 *
 * 2. BREAKTHROUGH RATES INCREASED: More frequent excitement
 *    - Base chance: 2.5%/hr (up from 2%)
 *    - Legendary breakthrough: +50 XP bonus
 *
 * 3. REST-AND-RETURN ENHANCED: Better catch-up mechanics
 *    - All tiers now include XP rewards
 *    - Dojo catch-up efficiency increased to 85%
 *
 * 4. WISDOM SPECIALIZATION FURTHER BUFFED:
 *    - Gacha luck bonus: 10% (up from 8%)
 *    - XP from gacha: 30% (up from 25%)
 * ============================================================================
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
      synergyBonus: 0,
      xpBonus: 0
    }
  },
  wisdom: {
    id: 'wisdom',
    name: 'Path of Wisdom',
    description: 'Enhanced learning, gacha fortune, and profile growth',
    icon: 'book',
    bonuses: {
      // BALANCE UPDATE v5.0: Further buffed to make Wisdom clearly attractive
      // Rationale: Wisdom should be THE choice for collectors and gacha enthusiasts.
      // The dojo penalty is offset by significantly better gacha returns.
      //
      // v5.0 trade-off:
      // - Lose 10% dojo income (~45 pts/hr at mid-game with v5.0 rates)
      // - Gain 10% gacha luck (buffed from 8%)
      // - Gain 80% ticket drop chance (buffed from 75%)
      // - Gain 30% XP from gacha pulls (buffed from 25%)
      // - NEW: +5% chance for character level-up on duplicate
      dojoPointsMultiplier: 0.90,   // -10% dojo income (unchanged)
      fishingPowerBonus: 0,
      gachaLuckBonus: 0.10,         // +10% gacha luck (buffed from 8%)
      ticketChanceBonus: 0.80,      // +80% ticket drop chance (buffed from 75%)
      currencyBonus: 0,
      synergyBonus: 0,
      xpBonusFromGacha: 0.30,       // +30% XP from gacha pulls (buffed from 25%)
      duplicateLevelUpBonus: 0.05   // NEW: +5% chance for extra level on duplicate
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
      synergyBonus: 0.1,            // +10% team synergy effectiveness
      xpBonus: 0
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
  // BALANCE UPDATE v5.0: Increased from 2% to 2.5% for more frequent excitement
  baseChancePerHour: 0.025, // 2.5% per hour

  // Multipliers by rarity
  // BALANCE UPDATE v5.0: Buffed legendary multiplier
  rarityMultipliers: {
    common: 0.5,
    uncommon: 0.75,
    rare: 1.0,
    epic: 1.35,       // Buffed from 1.25
    legendary: 1.75   // Buffed from 1.5
  },

  // Breakthrough types and their rewards
  // BALANCE UPDATE v5.0: Increased rewards across the board
  types: {
    skill_discovery: {
      weight: 40,
      name: 'Skill Discovery',
      description: 'Discovered a new technique!',
      rewards: { xpBonus: 600, pointsBonus: 100 }  // Buffed from 500 XP, added points
    },
    hidden_treasure: {
      weight: 30,
      name: 'Hidden Treasure',
      description: 'Found a hidden cache of resources!',
      rewards: { pointsBonus: 1250 }  // Buffed from 1000
    },
    moment_of_clarity: {
      weight: 20,
      name: 'Moment of Clarity',
      description: 'Achieved enlightenment!',
      rewards: { rollTickets: 2 }  // Buffed from 1
    },
    legendary_insight: {
      weight: 10,
      name: 'Legendary Insight',
      description: 'A rare and powerful discovery!',
      rewards: { premiumTickets: 2, xpBonus: 1200 }  // Buffed from 1 ticket, 1000 XP
    }
  }
};

// ===========================================
// FISHING ENHANCEMENTS
// ===========================================

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
  // BALANCE UPDATE v5.0: Buffed all rewards by ~15-20%, added 350 milestone
  // All milestones now include XP rewards for profile progression
  milestones: [
    { pulls: 10, reward: { type: 'points', quantity: 600, xp: 30 } },           // Buffed from 500
    { pulls: 30, reward: { type: 'rod_skin', id: 'starlight_rod', xp: 60 } },
    { pulls: 50, reward: { type: 'roll_tickets', quantity: 4, xp: 90 } },       // Buffed from 3
    { pulls: 75, reward: { type: 'points', quantity: 1800, xp: 120 } },         // Buffed from 1500
    { pulls: 100, reward: { type: 'roll_tickets', quantity: 6, xp: 180 } },     // Buffed from 5
    { pulls: 125, reward: { type: 'premium_tickets', quantity: 3, xp: 210 } },  // Buffed from 2
    { pulls: 150, reward: { type: 'premium_tickets', quantity: 6, xp: 240 } },  // Buffed from 5
    { pulls: 175, reward: { type: 'roll_tickets', quantity: 10, xp: 270 } },    // Buffed from 8
    { pulls: 200, reward: { type: 'premium_tickets', quantity: 12, xp: 360 } }, // Buffed from 10
    { pulls: 250, reward: { type: 'points', quantity: 12000, xp: 480 } },       // Buffed from 10000
    { pulls: 300, reward: { type: 'premium_tickets', quantity: 18, xp: 600 } }, // Buffed from 15
    { pulls: 350, reward: { type: 'character_selector', rarity: 'epic', xp: 750 } } // NEW: Ultimate endgame
  ],

  // Grace period for claiming milestones after banner ends
  gracePeriod: {
    enabled: true,
    daysAfterEnd: 14  // Extended from 7 to 14 days for better player experience
  }
};

// Gacha pity system configuration
const GACHA_PITY_CONFIG = {
  // Standard gacha pity thresholds
  standard: {
    rare: {
      hardPity: 10,       // Guaranteed rare at 10 pulls
      softPity: 7,        // Increased rate starts at 7
      softPityBoostPerPull: 0.10  // +10% additive rate per pull in soft pity
    },
    epic: {
      hardPity: 50,       // Guaranteed epic at 50 pulls
      softPity: 40,       // Increased rate starts at 40
      softPityBoostPerPull: 0.03  // +3% additive rate per pull in soft pity
    },
    legendary: {
      hardPity: 90,       // Guaranteed legendary at 90 pulls
      softPity: 75,       // Increased rate starts at 75
      softPityBoostPerPull: 0.06  // +6% additive rate per pull in soft pity
    }
  },
  // Banner pity threshold (for featured character)
  banner: {
    featured: {
      hardPity: 90,       // Guaranteed featured at 90 pulls
      softPity: 75,       // Increased rate starts at 75
      softPityBoostPerPull: 0.06  // +6% additive rate per pull in soft pity
    },
    // 50/50 system configuration
    fiftyFifty: {
      featuredChance: 0.5,  // 50% chance for featured on first 5-star
      guaranteedAfterLoss: true  // Next 5-star guaranteed featured after losing 50/50
    }
  },
  // Pity reset percentages for fate points exchange
  pityReset: {
    percentage: 0.5       // Reset to 50% of hard pity
  },
  // Banner pity carryover settings
  bannerCarryover: {
    enabled: true,
    carryoverPercentage: 0.5,  // 50% of pity carries to next banner
    guaranteedFlagCarries: false  // Guaranteed featured flag does NOT carry over
  }
};

const GACHA_FATE_POINTS = {
  enabled: true,

  // Points earned per pull type (1 pull = 1 FP for standard display, but varies by type)
  pointsPerPull: {
    standard: 1,
    banner: 1,    // Changed to 1 to match UI "1 pull = 1 FP"
    premium: 1    // Changed to 1 to match UI "1 pull = 1 FP"
  },

  // Weekly cap for fair progression
  weeklyCapEnabled: true,
  weeklyMax: 500,  // Maximum FP earnable per week

  // Rate-up banner specific
  rateUpBanner: {
    // When you pull a non-featured 5-star, earn bonus fate points
    nonFeaturedFiveStarPoints: 5
  },

  // FP decay system for economy health (optional - can be disabled)
  decay: {
    enabled: false,  // Set to true to enable decay
    decayAfterDays: 90,  // FP expires 90 days after earning
    warningDays: 30,  // Warn player when FP is 30 days from expiring
    // Seasonal cap as alternative to decay
    seasonalCap: {
      enabled: false,
      maxPerSeason: 2000,  // Maximum FP per season
      overflowConversion: {
        enabled: true,
        targetCurrency: 'points',
        conversionRate: 10  // 1 FP overflow = 10 points
      }
    }
  },

  // Exchange shop - costs for different rewards
  // BALANCE UPDATE v5.0: Further reduced costs for better player experience
  // Rationale: With weeklyMax of 500 FP, all rewards should be achievable
  // with reasonable play. Legendary now costs 300 FP (60% of weekly).
  exchangeOptions: {
    roll_tickets: {
      id: 'roll_tickets',
      name: 'Roll Ticket Bundle',
      description: 'Exchange for 6 roll tickets',     // Buffed from 5
      cost: 25  // Small, frequent reward option
    },
    premium_tickets: {
      id: 'premium_tickets',
      name: 'Premium Ticket Pack',
      description: 'Exchange for 2 premium tickets',   // Buffed from 1
      cost: 50  // Adjusted for 2 tickets
    },
    rare_selector: {
      id: 'rare_selector',
      name: 'Rare Selector',
      description: 'Choose any rare character',
      cost: 60  // Reduced from 75
    },
    epic_selector: {
      id: 'epic_selector',
      name: 'Epic Selector',
      description: 'Choose any epic character',
      cost: 175  // Reduced from 200 (35% of weekly)
    },
    legendary_selector: {
      id: 'legendary_selector',
      name: 'Legendary Selector',
      description: 'Choose any legendary character',
      cost: 300  // Reduced from 350 (60% of weekly, achievable in ~4 days)
    },
    pity_boost: {
      id: 'pity_boost',
      name: 'Pity Boost',
      description: 'Advance pity progress to 50% of guaranteed threshold',
      cost: 50  // Reduced from 60
    },
    xp_boost: {
      id: 'xp_boost',
      name: 'XP Boost',
      description: 'Get 500 account XP instantly',
      cost: 40  // NEW: Alternative reward for progression-focused players
    }
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
      { count: 100, reward: { title: 'Ichthyologist', premiumTickets: 3 } },
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
  // BALANCE UPDATE v5.0: Buffed all rewards by ~15-20%, improved messaging
  // XP values match those defined in XP_SOURCES.restAndReturn for consistency
  tiers: [
    { minDays: 2, maxDays: 3, bonus: { points: 600, xp: 120, message: 'Welcome back! Here\'s a small bonus.' } },
    { minDays: 4, maxDays: 7, bonus: { points: 1800, rollTickets: 3, xp: 350, message: 'We missed you! Enjoy these rewards.' } },
    { minDays: 8, maxDays: 14, bonus: { points: 3500, rollTickets: 6, premiumTickets: 2, xp: 850, message: 'Great to see you again! Here\'s a welcome back gift.' } },
    { minDays: 15, maxDays: 30, bonus: { points: 6000, rollTickets: 12, premiumTickets: 4, xp: 1750, message: 'It\'s been a while! We prepared something special.' } },
    { minDays: 31, maxDays: Infinity, bonus: { points: 12000, rollTickets: 25, premiumTickets: 8, characterSelector: 'rare', xp: 3500, message: 'Welcome home! Here\'s everything you need to catch up.' } }
  ],

  // Dojo catch-up (accumulated rewards don't decay completely)
  // BALANCE UPDATE v5.0: Improved efficiency and extended cap
  dojoCatchUp: {
    enabled: true,
    maxAccumulatedDays: 10, // Extended from 7 to 10 days
    efficiencyDecay: 0.85   // Improved from 80% to 85% efficiency
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
  FISHING_DOUBLE_OR_NOTHING,
  FISHING_VISUAL_RARITY_CONFIG,

  // Gacha
  GACHA_PITY_CONFIG,
  GACHA_MILESTONE_REWARDS,
  GACHA_FATE_POINTS,
  GACHA_ALTERNATIVE_PATHS,

  // Retention
  MASTERY_TRACKS,

  // Psychology
  REST_AND_RETURN_BONUS,
  STREAK_INSURANCE,
  CHECK_IN_EFFICIENCY
};
