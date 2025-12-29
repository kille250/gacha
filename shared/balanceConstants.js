/**
 * Shared Balance Constants
 *
 * ============================================================================
 * CENTRAL SOURCE OF TRUTH FOR ALL BALANCE VALUES
 * ============================================================================
 *
 * This file contains the core balance values that should be displayed in
 * the frontend UI (help texts, tooltips, etc.). When backend balance values
 * change, update this file to keep frontend in sync.
 *
 * VERSION: v9.0 (Complete Balance Audit & Sync)
 *
 * USAGE:
 * - Backend: Authoritative values are in respective config files
 * - Frontend: Reference these constants for display purposes
 * - UI: Use these for help text, tooltips, and explanatory content
 *
 * SYNCHRONIZATION CHECKLIST:
 * When updating balance values, ensure:
 * 1. Backend config is updated (dojo.js, fishing.js, accountLevel.js, etc.)
 * 2. This file is updated with new display values
 * 3. Frontend components using hardcoded values are updated
 *
 * v9.0 CHANGES:
 * - Added 350 gacha milestone XP (750 XP) to XP_SOURCES
 * - Complete balance audit verified all modes
 * - All frontend/backend values confirmed synced
 *
 * v8.0 CHANGES:
 * - Buffed Gacha XP from 12 to 15 per pull (+25%)
 * - Added all account level milestones (60, 75, 85, 90, 95, 100)
 * - Added extended prestige system (11-20 levels)
 * - Added first-time achievement bonuses
 * - Added character mastery XP system
 * - Synced all milestone rewards with frontend display
 * ============================================================================
 */

const BALANCE_VERSION = '9.0';

// ===========================================
// DOJO BALANCE CONSTANTS
// ===========================================

const DOJO_DISPLAY = {
  // Base points per hour by rarity (matches backend dojo.js v5.0+)
  basePointsPerHour: {
    common: 6,
    uncommon: 10,
    rare: 18,
    epic: 35,
    legendary: 70
  },

  // Daily caps (matches backend dojo.js v5.0+)
  dailyCaps: {
    points: 25000,
    rollTickets: 30,
    premiumTickets: 8
  },

  // Character level bonuses (matches backend leveling.js)
  levelMultipliers: {
    1: 1.00,    // Base power
    2: 1.15,    // +15%
    3: 1.30,    // +30%
    4: 1.50,    // +50%
    5: 1.75     // +75% (max level)
  },

  // Series synergy bonuses (matches backend dojo.js)
  seriesSynergy: {
    2: 1.15,    // +15%
    3: 1.35,    // +35%
    4: 1.55,    // +55%
    5: 1.75,    // +75%
    6: 2.00     // +100% (6+ characters)
  },

  // Efficiency scaling brackets (matches backend dojo.js v5.0+)
  efficiencyBrackets: [
    { threshold: 0, efficiency: 100, description: '0-350 pts/h: Full value' },
    { threshold: 350, efficiency: 90, description: '350-800 pts/h: 90% efficiency' },
    { threshold: 800, efficiency: 75, description: '800-1800 pts/h: 75% efficiency' },
    { threshold: 1800, efficiency: 55, description: '1800-3500 pts/h: 55% efficiency' },
    { threshold: 3500, efficiency: 35, description: '3500+ pts/h: 35% efficiency' }
  ],

  // Catch-up bonus thresholds
  catchUpBonus: {
    1: 2.50,    // 1 character: +150%
    2: 1.80,    // 2 characters: +80%
    3: 1.50,    // 3 characters: +50%
    4: 1.20,    // 4 characters: +20%
    5: 1.10     // 5 characters: +10%
  }
};

// ===========================================
// FISHING BALANCE CONSTANTS
// ===========================================

const FISHING_DISPLAY = {
  // Prestige XP rewards (matches backend fishing/prestige.js)
  prestigeXP: {
    1: 500,
    2: 1500,
    3: 4000,
    4: 8000,
    5: 15000
  },

  // Perfect catch multiplier
  perfectCatchMultiplier: 1.4,   // 40% bonus
  greatCatchMultiplier: 1.2,    // 20% bonus

  // Autofish efficiency
  autofishXPMultiplier: 0.75    // 75% of manual XP
};

// ===========================================
// GACHA BALANCE CONSTANTS
// ===========================================

const GACHA_DISPLAY = {
  // XP per pull - BALANCE UPDATE v8.0: Increased from 12 to 15 (+25%)
  // Rationale: Gacha was underpowered as XP source compared to fishing/dojo
  xpPerPull: 15,

  // Pity thresholds
  pity: {
    rare: { softPity: 7, hardPity: 10 },
    epic: { softPity: 40, hardPity: 50 },
    legendary: { softPity: 75, hardPity: 90 }
  },

  // Fate points weekly cap
  fatePointsWeeklyCap: 500,

  // Milestone rewards (must match gameDesign.js)
  milestones: {
    10: { type: 'points', quantity: 600, xp: 30 },
    30: { type: 'rod_skin', id: 'starlight_rod', xp: 60 },
    50: { type: 'roll_tickets', quantity: 4, xp: 90 },
    75: { type: 'points', quantity: 1800, xp: 120 },
    100: { type: 'roll_tickets', quantity: 6, xp: 180 },
    125: { type: 'premium_tickets', quantity: 3, xp: 210 },
    150: { type: 'premium_tickets', quantity: 6, xp: 240 },
    175: { type: 'roll_tickets', quantity: 10, xp: 270 },
    200: { type: 'premium_tickets', quantity: 12, xp: 360 },
    250: { type: 'points', quantity: 12000, xp: 480 },
    300: { type: 'premium_tickets', quantity: 18, xp: 600 },
    350: { type: 'character_selector', rarity: 'epic', xp: 750 }
  }
};

// ===========================================
// ACCOUNT LEVEL CONSTANTS
// ===========================================

const ACCOUNT_LEVEL_DISPLAY = {
  // Maximum account level
  maxLevel: 100,

  // Key milestones (must match accountLevel.js majorMilestones)
  milestones: {
    5: { name: 'Novice Trainer', reward: '500 pts, 1 roll ticket' },
    10: { name: "Warrior's Hall", reward: '1,500 pts, 3 roll, 1 premium', unlock: 'warriors_hall' },
    15: { name: 'Seasoned Collector', reward: '1,000 pts, 2 roll' },
    20: { name: 'Veteran Trainer', reward: '2,000 pts, 3 roll, +5% Dojo' },
    25: { name: "Master's Temple", reward: '5,000 pts, 5 roll, 2 premium', unlock: 'masters_temple' },
    30: { name: 'Elite Collector', reward: '3,000 pts, 4 roll, +2% fish rarity' },
    40: { name: 'Champion Trainer', reward: '5,000 pts, 5 roll, 2 premium, +5% XP' },
    50: { name: "Grandmaster's Sanctum", reward: '15,000 pts, 10 roll, 5 premium', unlock: 'grandmasters_sanctum' },
    60: { name: 'Legendary Trainer', reward: '8,000 pts, 6 roll, 3 premium, +10% Dojo' },
    75: { name: 'Mythic Champion', reward: '25,000 pts, 12 roll, 6 premium, +10% XP' },
    85: { name: 'Elite Commander', reward: '15,000 pts, 8 roll, 4 premium, +3% XP' },
    90: { name: 'Grand Warden', reward: '30,000 pts, 12 roll, 5 premium, +5% Dojo, +2% fish' },
    95: { name: 'Supreme Master', reward: '50,000 pts, 15 roll, 8 premium, +5% XP' },
    100: { name: 'Ultimate Master', reward: '100,000 pts, 25 roll, 15 premium, +15% all bonuses' }
  },

  // XP sources summary - BALANCE UPDATE v8.0: Gacha buffed from 12 to 15
  xpSources: {
    gachaPull: 15,           // Buffed from 12 in v8.0
    dojoClaim: 18,
    dojoEfficiencyBonus: 10,
    dojoPassivePerHour: 3,
    fishingCatchCommon: 2,
    fishingCatchLegendary: 20,
    perfectCatchMultiplier: 1.4,
    greatCatchMultiplier: 1.2,
    autofishMultiplier: 0.75
  },

  // Prestige system
  prestige: {
    maxLevel: 20,
    requiredAccountLevel: 100,
    resetToLevel: 50,
    bonusesPerLevel: {
      xpMultiplier: 0.02,        // +2% XP per prestige
      dojoEfficiency: 0.01,      // +1% dojo per prestige
      fishingRarity: 0.005,      // +0.5% rare fish per prestige
      gachaLuckPerFive: 0.01     // +1% gacha luck per 5 prestige levels
    }
  },

  // First-time achievement bonuses (NEW in v6.0, documented in v8.0)
  firstTimeAchievements: {
    firstLegendaryFish: 200,
    firstEpicCharacter: 100,
    firstLegendaryCharacter: 300,
    firstPrestige: 500,
    firstMaxCharacter: 150,
    firstAreaUnlock: 50,
    firstPerfectStreak10: 75,
    firstWeeklyBonus: 100
  },

  // Character mastery XP (NEW in v6.0, documented in v8.0)
  characterMastery: {
    xpPerLevel: 15,
    maxMasteryBonus: 50
  }
};

// ===========================================
// UI THRESHOLDS
// ===========================================

const UI_THRESHOLDS = {
  // Daily cap warning threshold (percentage)
  // Shows warning when player approaches this % of daily limit
  dailyCapWarningPercent: 80,

  // Low quota warning for fishing (casts remaining)
  fishingLowQuota: 20
};

// ===========================================
// HELP TEXT TEMPLATES
// ===========================================

const HELP_TEXT = {
  dojo: {
    baseRates: `Each character generates points based on their rarity: Common (${DOJO_DISPLAY.basePointsPerHour.common}/h), Uncommon (${DOJO_DISPLAY.basePointsPerHour.uncommon}/h), Rare (${DOJO_DISPLAY.basePointsPerHour.rare}/h), Epic (${DOJO_DISPLAY.basePointsPerHour.epic}/h), Legendary (${DOJO_DISPLAY.basePointsPerHour.legendary}/h).`,

    levelBonuses: `Duplicate characters increase level (max 5). Higher levels give increasing bonuses: Lv2 +15%, Lv3 +30%, Lv4 +50%, Lv5 +75%!`,

    synergy: `Training multiple characters from the same series grants bonus earnings. 2 chars = +15%, 3 = +35%, 4 = +55%, 5 = +75%, 6+ = +100%.`,

    efficiency: `To keep the game balanced, earnings scale progressively: 0-350 pts/h (100%), 350-800 (90%), 800-1800 (75%), 1800-3500 (55%), 3500+ (35%). Efficiency shows your effective rate.`,

    dailyCaps: `Daily caps: ${DOJO_DISPLAY.dailyCaps.points.toLocaleString()} points, ${DOJO_DISPLAY.dailyCaps.rollTickets} roll tickets, ${DOJO_DISPLAY.dailyCaps.premiumTickets} premium tickets. Limits reset at midnight.`
  }
};

// ===========================================
// EXPORTS
// ===========================================

// CommonJS export for Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BALANCE_VERSION,
    DOJO_DISPLAY,
    FISHING_DISPLAY,
    GACHA_DISPLAY,
    ACCOUNT_LEVEL_DISPLAY,
    UI_THRESHOLDS,
    HELP_TEXT
  };
}

// ES Module export for frontend (when using bundler)
// export { BALANCE_VERSION, DOJO_DISPLAY, FISHING_DISPLAY, GACHA_DISPLAY, ACCOUNT_LEVEL_DISPLAY, UI_THRESHOLDS, HELP_TEXT };
