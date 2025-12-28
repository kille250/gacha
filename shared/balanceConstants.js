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
 * VERSION: v7.0 (Synchronized Balance Update)
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
 * ============================================================================
 */

const BALANCE_VERSION = '7.0';

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
  // XP per pull
  xpPerPull: 12,

  // Pity thresholds
  pity: {
    rare: { softPity: 7, hardPity: 10 },
    epic: { softPity: 40, hardPity: 50 },
    legendary: { softPity: 75, hardPity: 90 }
  },

  // Fate points weekly cap
  fatePointsWeeklyCap: 500
};

// ===========================================
// ACCOUNT LEVEL CONSTANTS
// ===========================================

const ACCOUNT_LEVEL_DISPLAY = {
  // Key milestones
  milestones: {
    10: "Warrior's Hall",
    25: "Master's Temple",
    50: "Grandmaster's Sanctum",
    75: "Mythic Champion",
    100: "Ultimate Master"
  },

  // XP sources summary
  xpSources: {
    gachaPull: 12,
    dojoClaim: 18,
    dojoEfficiencyBonus: 10,
    dojoPassivePerHour: 3
  },

  // Prestige system
  prestige: {
    maxLevel: 20,
    requiredAccountLevel: 100,
    resetToLevel: 50
  }
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
    HELP_TEXT
  };
}

// ES Module export for frontend (when using bundler)
// export { BALANCE_VERSION, DOJO_DISPLAY, FISHING_DISPLAY, GACHA_DISPLAY, ACCOUNT_LEVEL_DISPLAY, HELP_TEXT };
