/**
 * Fishing Minigame Configuration
 *
 * Centralized configuration for fish types, trading options, and game settings.
 * Extracted from routes/fishing.js for better maintainability.
 *
 * ============================================================================
 * BALANCE UPDATE (v8.0 - Complete Mode Harmony & Frontend Sync)
 * ============================================================================
 * Key changes in v8.0:
 *
 * 1. FRONTEND SYNCHRONIZATION:
 *    - Perfect catch multiplier (1.4x) synced with shared constants
 *    - Great catch multiplier (1.2x) synced with shared constants
 *    - Autofish multiplier (0.75x) synced with shared constants
 *    - Fishing XP values now documented in balanceConstants.js
 *
 * 2. CROSS-MODE BALANCE DOCUMENTATION:
 *    - Active fishing: ~60-120 XP/hour
 *    - Autofish: ~45-90 XP/hour (0.75x of manual)
 *    - Perfect catches: 40% bonus XP
 *    - Great catches: 20% bonus XP
 *
 * ============================================================================
 * BALANCE UPDATE (v6.0 - Comprehensive Mode Harmony)
 * ============================================================================
 * Key changes:
 *
 * 1. STREAK MILESTONES EXTENDED: Smoother progression
 *    - Added 30 streak: +40 XP (fills 20→50 gap)
 *    - Added 40 streak: +55 XP (fills 20→50 gap)
 *    - Streak bonuses now synced with accountLevel.js
 *
 * 2. MANUAL FISHING EXCELLENCE: Skill-based rewards
 *    - NEW: 5 perfect catches in a row: +25 XP
 *    - NEW: 10 perfect catches daily: +50 XP
 *    - NEW: 25 perfect catches daily: +100 XP (mastery)
 *    - Rationale: Reward skilled active play
 *
 * 3. FIRST-TIME ACHIEVEMENTS: Milestone celebrations
 *    - First legendary fish: 200 XP
 *    - First area unlock: 50 XP
 *    - First 10-catch perfect streak: 75 XP
 *    - Rationale: Make achievements feel special
 *
 * 4. SYNERGY WITH ACCOUNT PROGRESSION:
 *    - Fishing rarity bonus from prestige (0.5% per level)
 *    - New level 90 milestone adds +2% fishing rarity
 *
 * Previous v5.0 changes (preserved):
 * - Perfect: 1.4x, Great: 1.2x, Autofish: 0.75x XP
 * - Epic fish: 700 pts, Legendary: 3000 pts
 * - Daily limits: 700 manual, 200 autofish, 25k trade pts
 * - Ocean: Rank 40, Abyss: Rank 75
 *
 * Previous v3.0 changes (preserved):
 * - Account XP integration
 * - Account level rarity bonuses
 * - Prestige XP multiplier (+5% per level)
 * - Daily variety bonus
 * ============================================================================
 *
 * ============================================================================
 * BALANCE SUMMARY (v2.0 - Game Mode Balancing Update)
 * ============================================================================
 * Key balance changes made:
 *
 * 1. ABYSS AREA: Reduced unlock cost from 50,000 to 35,000 points
 *    - Previous: ~100 hours of Dojo income to unlock
 *    - Now: ~70 hours - achievable within 1-2 weeks of active play
 *
 * 2. EPIC FISH VALUE: Increased trade value from 400 to 600 points
 *    - Better scales with rarity (epic ~4% vs legendary ~1%)
 *    - Added new epic fish → 3 roll tickets trade option
 *
 * 3. FISH TOTALS: Game has 15 fish species total
 *    - Common: 3 (Sardine, Anchovy, Herring)
 *    - Uncommon: 3 (Bass, Trout, Mackerel)
 *    - Rare: 3 (Salmon, Tuna, Snapper)
 *    - Epic: 3 (Swordfish, Marlin, Manta)
 *    - Legendary: 3 (Whale, Kraken, Dragon)
 * ============================================================================
 *
 * ============================================================================
 * EMOJI USAGE NOTICE
 * ============================================================================
 * This file contains INTENTIONAL emoji usage as game data. Emojis represent:
 * - Fish species identifiers (displayed in UI as part of fish identity)
 * - Fishing area icons (visual representation in area selection)
 * - Fishing rod tier icons (displayed in equipment UI)
 * - Trade option icons (displayed in trading post)
 * - Streak bonus messages (shown to players as achievements)
 *
 * These emojis are REQUIRED for game functionality and should NOT be removed.
 * They are stored in the database and sent to clients as part of game data.
 * ============================================================================
 */

// ===========================================
// GAME SETTINGS
// ===========================================

const FISHING_CONFIG = {
  // === DEMOCRATIZED AUTOFISH SYSTEM ===
  // Everyone can autofish with daily limits
  // Higher ranks get bonus capacity
  autofish: {
    // Base daily limit for all players
    baseDailyLimit: 150,
    // Bonus limits based on rank
    rankBonuses: {
      top5: 200,    // Top 5: +200 extra
      top10: 150,   // Top 6-10: +150 extra
      top25: 100,   // Top 11-25: +100 extra
      top50: 50,    // Top 26-50: +50 extra
      top100: 25    // Top 51-100: +25 extra
    },
    // Premium ticket holders get multiplier
    premiumMultiplier: 1.5
  },
  
  // Legacy field - kept for backwards compatibility
  autofishUnlockRank: 999, // Effectively disabled - everyone can autofish now
  
  // Autofish cooldown in milliseconds
  autofishCooldown: 6000,
  
  // Cast cooldown in milliseconds
  castCooldown: 5000,
  
  // Cost to cast (0 for free fishing)
  castCost: 0,
  
  // === DAILY LIMITS (Anti-Inflation) ===
  // BALANCE UPDATE v5.0: Increased all limits for dedicated players
  // Matches updated Dojo caps for cross-mode consistency
  dailyLimits: {
    manualCasts: 700,         // Max manual casts per day (was 600)
    autofishCasts: 200,       // Base autofish limit (was 175)
    pointsFromTrades: 25000,  // Max points from trades per day (matches Dojo v5.0)
    pointsSoftCap: 18000,     // Soft cap raised (was 15k)
    rollTickets: 30,          // Max roll tickets from fishing per day (matches Dojo v5.0)
    premiumTickets: 8         // Max premium tickets (matches Dojo v5.0)
  },
  
  // Network latency buffer for reaction time validation (ms)
  // Subtracts this amount from server-measured reaction time to compensate for
  // network round-trip delay. Makes perfect catches achievable regardless of connection speed.
  latencyBuffer: 200,
  
  // Minimum human reaction time (anti-cheat, prevents instant catches)
  minReactionTime: 80,
  
  // Session cleanup interval (ms)
  cleanupInterval: 15000,
  
  // Session expiry time (ms)
  sessionExpiry: 30000,
  
  // Trade timeout in ms (for stuck trade cleanup)
  tradeTimeout: 30000,
  
  // Rank cache TTL in ms
  rankCacheTTL: 30000,
  
  // Autofish success rates by rarity
  // Philosophy: Rare fish are already hard to encounter - don't double-punish with low catch rates
  // Overall efficiency: ~50% of active fishing (fair reward for top players)
  autofishSuccessRates: {
    legendary: 0.50,  // Rare encounter, fair catch when it appears
    epic: 0.55,       // Slightly harder than common
    rare: 0.60,       // Balanced
    uncommon: 0.70,   // Easy to catch
    common: 0.80      // Very reliable
  },
  
  // Perfect/Great catch thresholds - dynamic per rarity for better skill ceiling
  catchQuality: {
    // Default thresholds
    perfectThreshold: 0.25,  // 25% of window = Perfect (was 30%)
    greatThreshold: 0.55,    // 55% of window = Great (was 60%)
    perfectMultiplier: 2.0,  // Double fish for perfect
    greatMultiplier: 1.5,    // 50% bonus for great
    // Per-rarity overrides (harder fish = tighter windows)
    rarityThresholds: {
      legendary: { perfect: 0.20, great: 0.45 },  // Increased from 0.15 for fairer gameplay
      epic: { perfect: 0.20, great: 0.48 },
      rare: { perfect: 0.22, great: 0.52 },
      uncommon: { perfect: 0.25, great: 0.55 },
      common: { perfect: 0.30, great: 0.60 }
    }
  },
  
  // Miss timeout per rarity (ms) - how long player has to catch after fish appears
  // Rarer fish give slightly less time, adding to the challenge
  missTimeout: {
    common: 3000,      // 3 seconds
    uncommon: 2800,
    rare: 2500,
    epic: 2200,
    legendary: 2000    // 2 seconds - tense moment!
  },
  
  // Pity system - bad luck protection
  pity: {
    // Casts required for guaranteed rarity (soft pity starts earlier)
    legendary: {
      softPity: 80,     // Start increasing odds at 80 casts
      hardPity: 120,    // Guaranteed at 120 casts
      softPityBonus: 0.02  // +2% per cast after soft pity
    },
    epic: {
      softPity: 30,
      hardPity: 50,
      softPityBonus: 0.03
    }
  },
  
  // === CASTING TIMING ===
  casting: {
    minWaitTime: 1500,    // Minimum time before fish bites (ms)
    maxWaitTime: 6000     // Maximum time before fish bites (ms)
  },
  
  // === STREAK BONUS SYSTEM ===
  // Consecutive catches without missing award bonuses
  // BALANCE UPDATE v6.0: Added 30 and 40 streak milestones to fill the gap
  streakBonuses: {
    5: {
      pointsMultiplier: 1.1,   // +10% points from trades
      message: '🔥 5 streak! +10% bonus!'
    },
    10: {
      pointsMultiplier: 1.2,   // +20% points
      message: '🔥🔥 10 streak! +20% bonus!'
    },
    20: {
      pointsMultiplier: 1.3,   // +30% points
      extraFishChance: 0.1,    // 10% chance for extra fish
      message: '🔥🔥🔥 20 streak! +30% bonus + extra fish chance!'
    },
    // NEW in v6.0: Fill the 20→50 gap for smoother progression
    30: {
      pointsMultiplier: 1.35,  // +35% points
      extraFishChance: 0.12,   // 12% chance for extra fish
      rarityBonus: 0.02,       // +2% rare+ chance
      message: '🔥🔥🔥🔥 30 streak! +35% bonus + rarity boost!'
    },
    40: {
      pointsMultiplier: 1.42,  // +42% points
      extraFishChance: 0.15,   // 15% chance for extra fish
      rarityBonus: 0.035,      // +3.5% rare+ chance
      message: '🔥🔥🔥🔥🔥 40 streak! Almost legendary!'
    },
    50: {
      pointsMultiplier: 1.5,   // +50% points
      extraFishChance: 0.2,    // 20% chance for extra fish
      rarityBonus: 0.05,       // +5% rare+ chance
      message: '🌟 LEGENDARY 50 STREAK! Maximum bonuses!'
    }
  },
  
  // === MERCY TIMER (Anti-Frustration) ===
  // After consecutive misses, timing window increases
  mercyTimer: {
    missThreshold: 3,         // After 3 misses in a row
    timingBonusPerMiss: 150,  // +150ms per miss over threshold
    maxTimingBonus: 600       // Max +600ms bonus (caps at 3 mercy stacks)
  },
  
  // === SESSION LIMITS (Exploit Prevention) ===
  sessionLimits: {
    maxActiveSessionsPerUser: 3,  // Max concurrent fishing sessions
    maxMapSize: 10000             // Max entries in memory maps
  }
};

// ===========================================
// FISHING AREAS
// ===========================================

const FISHING_AREAS = {
  pond: {
    id: 'pond',
    name: 'Peaceful Pond',
    emoji: '🏞️',
    description: 'A calm pond perfect for beginners',
    unlockCost: 0,
    unlockRank: null,
    fishPool: ['sardine', 'anchovy', 'herring', 'bass', 'trout'],
    rarityBonus: 0,
    background: 'pond'
  },
  river: {
    id: 'river',
    name: 'Rushing River',
    emoji: '🏔️',
    description: 'Fast-flowing waters with better catches',
    unlockCost: 3000,
    unlockRank: null,
    fishPool: ['trout', 'mackerel', 'salmon', 'tuna', 'snapper'],
    rarityBonus: 0.1, // +10% rare+ chance
    background: 'river'
  },
  ocean: {
    id: 'ocean',
    name: 'Open Ocean',
    emoji: '🌊',
    description: 'Deep waters where legends lurk',
    unlockCost: 10000,
    // BALANCE UPDATE v5.0: Reduced from rank 50 to rank 40
    // Rationale: Make ocean accessible earlier for mid-game content.
    // Players reaching rank 40 have demonstrated commitment.
    unlockRank: 40,
    fishPool: ['tuna', 'snapper', 'swordfish', 'marlin', 'manta', 'whale'],
    rarityBonus: 0.2, // +20% rare+ chance
    background: 'ocean'
  },
  abyss: {
    id: 'abyss',
    name: 'The Abyss',
    emoji: '🌑',
    description: 'Where mythical creatures dwell',
    // BALANCE UPDATE v5.0: Reduced from 20,000 to 15,000 points
    // Rationale: With buffed dojo/fishing rates, 15k is achievable in ~20 days.
    // Makes endgame content accessible within first month for active players.
    unlockCost: 15000,
    // BALANCE UPDATE v5.0: Changed from rank 100 to rank 75
    // Rationale: Rank 100 was too exclusive for core content.
    // Rank 75 is still a significant achievement but more accessible.
    unlockRank: 75,
    fishPool: ['marlin', 'manta', 'whale', 'kraken', 'dragon'],
    rarityBonus: 0.35, // +35% rare+ chance
    background: 'abyss'
  }
};

// ===========================================
// FISHING RODS
// ===========================================

const FISHING_RODS = {
  basic: {
    id: 'basic',
    name: 'Basic Rod',
    emoji: '🎣',
    description: 'A simple fishing rod',
    cost: 0,
    timingBonus: 0,       // Extra ms for timing window
    rarityBonus: 0,       // % bonus to rare+ fish
    perfectBonus: 0       // % bonus to perfect threshold
  },
  bronze: {
    id: 'bronze',
    name: 'Bronze Rod',
    emoji: '🥉',
    description: 'Slightly better grip for timing',
    cost: 1500,
    timingBonus: 50,
    rarityBonus: 0,
    perfectBonus: 0.02
  },
  silver: {
    id: 'silver',
    name: 'Silver Rod',
    emoji: '🥈',
    description: 'Attracts uncommon fish',
    cost: 5000,
    timingBonus: 100,
    rarityBonus: 0.05,
    perfectBonus: 0.03
  },
  gold: {
    id: 'gold',
    name: 'Golden Rod',
    emoji: '🥇',
    description: 'Premium craftsmanship',
    cost: 15000,
    timingBonus: 150,
    rarityBonus: 0.1,
    perfectBonus: 0.05
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond Rod',
    emoji: '💎',
    description: 'Legendary fishing equipment',
    cost: 50000,
    timingBonus: 200,
    rarityBonus: 0.15,
    perfectBonus: 0.08
  },
  master: {
    id: 'master',
    name: 'Master Angler\'s Rod',
    emoji: '👑',
    description: 'The ultimate fishing tool',
    cost: 150000,
    timingBonus: 300,
    rarityBonus: 0.25,
    perfectBonus: 0.1,
    requiresPrestige: 1
  }
};

// ===========================================
// DAILY CHALLENGES
// ===========================================

const DAILY_CHALLENGES = {
  // Catch-based challenges
  catch_10: {
    id: 'catch_10',
    name: 'Warming Up',
    description: 'Catch 10 fish',
    type: 'catch',
    target: 10,
    reward: { points: 100 },
    difficulty: 'easy'
  },
  catch_50: {
    id: 'catch_50',
    name: 'Busy Day',
    description: 'Catch 50 fish',
    type: 'catch',
    target: 50,
    reward: { rollTickets: 2 },
    difficulty: 'medium'
  },
  catch_100: {
    id: 'catch_100',
    name: 'Fishing Marathon',
    description: 'Catch 100 fish',
    type: 'catch',
    target: 100,
    reward: { premiumTickets: 1, points: 500 },
    difficulty: 'hard'
  },
  
  // Perfect catch challenges
  perfect_3: {
    id: 'perfect_3',
    name: 'Quick Reflexes',
    description: 'Get 3 Perfect catches',
    type: 'perfect',
    target: 3,
    reward: { points: 200 },
    difficulty: 'easy'
  },
  perfect_10: {
    id: 'perfect_10',
    name: 'Master Timing',
    description: 'Get 10 Perfect catches',
    type: 'perfect',
    target: 10,
    reward: { rollTickets: 3 },
    difficulty: 'hard'
  },
  
  // Rarity challenges
  catch_rare: {
    id: 'catch_rare',
    name: 'Rare Find',
    description: 'Catch 5 Rare or better fish',
    type: 'rarity',
    targetRarity: ['rare', 'epic', 'legendary'],
    target: 5,
    reward: { points: 300 },
    difficulty: 'medium'
  },
  catch_epic: {
    id: 'catch_epic',
    name: 'Epic Hunter',
    description: 'Catch 2 Epic or Legendary fish',
    type: 'rarity',
    targetRarity: ['epic', 'legendary'],
    target: 2,
    reward: { premiumTickets: 1 },
    difficulty: 'hard'
  },
  catch_legendary: {
    id: 'catch_legendary',
    name: 'Legend Seeker',
    description: 'Catch a Legendary fish',
    type: 'rarity',
    targetRarity: ['legendary'],
    target: 1,
    reward: { premiumTickets: 2, points: 1000 },
    difficulty: 'legendary'
  },
  
  // Trade challenges
  trade_3: {
    id: 'trade_3',
    name: 'Trader',
    description: 'Complete 3 trades',
    type: 'trade',
    target: 3,
    reward: { points: 150 },
    difficulty: 'easy'
  },
  collection_trade: {
    id: 'collection_trade',
    name: 'Collector',
    description: 'Complete a Collection trade',
    type: 'collection_trade',
    target: 1,
    reward: { rollTickets: 2, premiumTickets: 1 },
    difficulty: 'hard'
  },
  
  // Streak challenges (manual fishing only - autofish doesn't count for streaks)
  streak_5: {
    id: 'streak_5',
    name: 'On a Roll',
    description: 'Catch 5 fish in a row without missing (manual fishing only)',
    type: 'streak',
    target: 5,
    reward: { points: 250 },
    difficulty: 'medium',
    requiresManual: true // Hint for challenge generation filtering
  },
  streak_10: {
    id: 'streak_10',
    name: 'Unstoppable',
    description: 'Catch 10 fish in a row without missing (manual fishing only)',
    type: 'streak',
    target: 10,
    reward: { premiumTickets: 1 },
    difficulty: 'hard',
    requiresManual: true
  },
  streak_20: {
    id: 'streak_20',
    name: 'Master Angler',
    description: 'Catch 20 fish in a row without missing (manual fishing only)',
    type: 'streak',
    target: 20,
    reward: { premiumTickets: 2, points: 500 },
    difficulty: 'legendary',
    requiresManual: true
  },
  
  // Autofish challenges
  autofish_50: {
    id: 'autofish_50',
    name: 'Idle Fisher',
    description: 'Catch 50 fish with autofish',
    type: 'autofish_catch',
    target: 50,
    reward: { points: 200 },
    difficulty: 'easy'
  }
};

/**
 * Check if a challenge is completable in a given area
 * @param {Object} challenge - Challenge definition
 * @param {string} areaId - Current fishing area
 * @returns {boolean} - Whether challenge is completable
 */
function isChallengeCompletableInArea(challenge, areaId) {
  // If no area specified, assume all challenges are valid (backwards compatibility)
  if (!areaId) return true;
  
  const area = FISHING_AREAS[areaId];
  if (!area) return true;
  
  // Check rarity-based challenges
  if (challenge.type === 'rarity' && challenge.targetRarity) {
    // Get fish available in this area and their rarities
    const areaFishIds = area.fishPool || [];
    const areaRarities = new Set();
    
    for (const fishId of areaFishIds) {
      const fish = FISH_TYPES.find(f => f.id === fishId);
      if (fish) {
        areaRarities.add(fish.rarity);
      }
    }
    
    // Check if ANY of the target rarities are available in this area
    const hasRequiredRarity = challenge.targetRarity.some(r => areaRarities.has(r));
    if (!hasRequiredRarity) return false;
  }
  
  return true;
}

/**
 * Generate 3 random daily challenges based on difficulty distribution
 * Filters out challenges that are impossible in the player's current area.
 * 
 * @param {string} [areaId='pond'] - Player's current fishing area
 * @returns {Array} Array of challenge IDs
 */
function generateDailyChallenges(areaId = 'pond') {
  const allChallenges = Object.values(DAILY_CHALLENGES);
  
  // Filter challenges that are completable in the current area
  const challenges = allChallenges.filter(c => isChallengeCompletableInArea(c, areaId));
  
  // Distribution: 1 easy, 1 medium, 1 hard/legendary
  const easy = challenges.filter(c => c.difficulty === 'easy');
  const medium = challenges.filter(c => c.difficulty === 'medium');
  const hard = challenges.filter(c => c.difficulty === 'hard' || c.difficulty === 'legendary');
  
  const selected = [];
  
  if (easy.length > 0) {
    selected.push(easy[Math.floor(Math.random() * easy.length)].id);
  }
  if (medium.length > 0) {
    selected.push(medium[Math.floor(Math.random() * medium.length)].id);
  }
  if (hard.length > 0) {
    selected.push(hard[Math.floor(Math.random() * hard.length)].id);
  }
  
  return selected;
}

// ===========================================
// FISH TYPES
// ===========================================

const FISH_TYPES = [
  // Common fish (60% chance) - easy timing
  { id: 'sardine', name: 'Sardine', emoji: '🐟', rarity: 'common', minReward: 5, maxReward: 10, timingWindow: 2000, weight: 25 },
  { id: 'anchovy', name: 'Anchovy', emoji: '🐟', rarity: 'common', minReward: 5, maxReward: 12, timingWindow: 2000, weight: 20 },
  { id: 'herring', name: 'Herring', emoji: '🐟', rarity: 'common', minReward: 8, maxReward: 15, timingWindow: 1800, weight: 15 },
  
  // Uncommon fish (25% chance) - medium timing
  { id: 'bass', name: 'Sea Bass', emoji: '🐠', rarity: 'uncommon', minReward: 20, maxReward: 35, timingWindow: 1500, weight: 12 },
  { id: 'trout', name: 'Rainbow Trout', emoji: '🐠', rarity: 'uncommon', minReward: 25, maxReward: 40, timingWindow: 1400, weight: 8 },
  { id: 'mackerel', name: 'Mackerel', emoji: '🐠', rarity: 'uncommon', minReward: 30, maxReward: 50, timingWindow: 1300, weight: 5 },
  
  // Rare fish (10% chance) - harder timing
  { id: 'salmon', name: 'Salmon', emoji: '🐡', rarity: 'rare', minReward: 60, maxReward: 100, timingWindow: 1000, weight: 5 },
  { id: 'tuna', name: 'Bluefin Tuna', emoji: '🐡', rarity: 'rare', minReward: 80, maxReward: 120, timingWindow: 900, weight: 3 },
  { id: 'snapper', name: 'Red Snapper', emoji: '🐡', rarity: 'rare', minReward: 70, maxReward: 110, timingWindow: 950, weight: 2 },
  
  // Epic fish (4% chance) - very hard timing
  { id: 'swordfish', name: 'Swordfish', emoji: '🦈', rarity: 'epic', minReward: 150, maxReward: 250, timingWindow: 700, weight: 2.5 },
  { id: 'marlin', name: 'Blue Marlin', emoji: '🦈', rarity: 'epic', minReward: 200, maxReward: 300, timingWindow: 650, weight: 1 },
  { id: 'manta', name: 'Manta Ray', emoji: '🦈', rarity: 'epic', minReward: 180, maxReward: 280, timingWindow: 680, weight: 0.5 },
  
  // Legendary fish (1% chance) - extremely hard timing
  { id: 'whale', name: 'Golden Whale', emoji: '🐋', rarity: 'legendary', minReward: 500, maxReward: 800, timingWindow: 500, weight: 0.6 },
  { id: 'kraken', name: 'Baby Kraken', emoji: '🦑', rarity: 'legendary', minReward: 600, maxReward: 1000, timingWindow: 450, weight: 0.3 },
  { id: 'dragon', name: 'Sea Dragon', emoji: '🐉', rarity: 'legendary', minReward: 800, maxReward: 1500, timingWindow: 400, weight: 0.1 },
];

// Calculate total weight for probability (used internally for reference)
const _TOTAL_WEIGHT = FISH_TYPES.reduce((sum, fish) => sum + fish.weight, 0);
void _TOTAL_WEIGHT; // Suppress unused warning - value is documented for reference

/**
 * Calculate pity bonus for a given rarity
 * Uses exponential scaling for a noticeable increase in odds as pity builds
 * 
 * @param {Object} pityData - User's current pity counters
 * @param {string} rarity - 'legendary' or 'epic'
 * @returns {number} - Bonus weight to add
 */
function calculatePityBonus(pityData, rarity) {
  const pityConfig = FISHING_CONFIG.pity[rarity];
  if (!pityConfig || !pityData) return 0;
  
  const count = pityData[rarity] || 0;
  
  // Hard pity - guaranteed
  if (count >= pityConfig.hardPity) {
    return 1000; // Very high weight to guarantee
  }
  
  // Soft pity - exponential scaling for noticeable effect
  // Example for Legendary (softPity: 80, hardPity: 120):
  // At 80 casts: +0.4 weight (~1.4% chance, up from 1%)
  // At 90 casts: +1.2 weight (~2.2% chance)
  // At 100 casts: +3.6 weight (~4.6% chance)
  // At 110 casts: +10.8 weight (~11.8% chance)
  // At 119 casts: ~30 weight (~31% chance)
  if (count >= pityConfig.softPity) {
    const overPity = count - pityConfig.softPity;
    const pityRange = pityConfig.hardPity - pityConfig.softPity; // 40 for legendary
    const progress = overPity / pityRange; // 0 to 1
    
    // Exponential curve: starts slow, accelerates near hard pity
    // Base formula: baseWeight * (3^(progress * 2) - 1)
    const baseWeight = rarity === 'legendary' ? 1.0 : 4.0; // Match base fish weights
    const exponentialBonus = baseWeight * (Math.pow(3, progress * 2) - 1);
    
    // Cap at 50x base weight to prevent overflow before hard pity
    return Math.min(exponentialBonus, baseWeight * 50);
  }
  
  return 0;
}

/**
 * Select a random fish based on weights with optional pity system
 * @param {Object} pityData - Optional user's pity counters for bad luck protection
 * @returns {Object} - { fish, pityTriggered: boolean, resetPity: string[] }
 */
function selectRandomFish(pityData = null) {
  // Calculate adjusted weights with pity bonuses
  let adjustedWeights = FISH_TYPES.map(fish => ({
    ...fish,
    adjustedWeight: fish.weight
  }));
  
  let resetPity = [];
  
  if (pityData) {
    // Check for hard pity (guaranteed)
    const legendaryPity = FISHING_CONFIG.pity.legendary;
    const epicPity = FISHING_CONFIG.pity.epic;
    
    if (pityData.legendary >= legendaryPity.hardPity) {
      // Force legendary fish
      const legendaryFish = FISH_TYPES.filter(f => f.rarity === 'legendary');
      const fish = legendaryFish[Math.floor(Math.random() * legendaryFish.length)];
      return { 
        fish, 
        pityTriggered: true, 
        resetPity: ['legendary', 'epic']  // Reset both counters
      };
    }
    
    if (pityData.epic >= epicPity.hardPity) {
      // Force epic fish
      const epicFish = FISH_TYPES.filter(f => f.rarity === 'epic');
      const fish = epicFish[Math.floor(Math.random() * epicFish.length)];
      return { 
        fish, 
        pityTriggered: true, 
        resetPity: ['epic']  // Reset epic counter
      };
    }
    
    // Apply soft pity bonuses
    const legendaryBonus = calculatePityBonus(pityData, 'legendary');
    const epicBonus = calculatePityBonus(pityData, 'epic');
    
    adjustedWeights = adjustedWeights.map(fish => {
      let bonus = 0;
      if (fish.rarity === 'legendary') bonus = legendaryBonus;
      else if (fish.rarity === 'epic') bonus = epicBonus;
      
      return {
        ...fish,
        adjustedWeight: fish.weight + bonus
      };
    });
  }
  
  const totalAdjusted = adjustedWeights.reduce((sum, f) => sum + f.adjustedWeight, 0);
  const random = Math.random() * totalAdjusted;
  let cumulative = 0;
  
  for (const fish of adjustedWeights) {
    cumulative += fish.adjustedWeight;
    if (random < cumulative) {
      // Determine which pity counters to reset based on caught rarity
      if (fish.rarity === 'legendary') {
        resetPity = ['legendary', 'epic'];
      } else if (fish.rarity === 'epic') {
        resetPity = ['epic'];
      }
      
      return { 
        fish: FISH_TYPES.find(f => f.id === fish.id), 
        pityTriggered: false, 
        resetPity 
      };
    }
  }
  
  return { fish: FISH_TYPES[0], pityTriggered: false, resetPity: [] };
}

/**
 * Get catch quality thresholds for a specific rarity
 * @param {string} rarity - Fish rarity
 * @returns {Object} - { perfectThreshold, greatThreshold }
 */
function getCatchThresholds(rarity) {
  const overrides = FISHING_CONFIG.catchQuality.rarityThresholds?.[rarity];
  if (overrides) {
    return {
      perfectThreshold: overrides.perfect,
      greatThreshold: overrides.great,
      perfectMultiplier: FISHING_CONFIG.catchQuality.perfectMultiplier,
      greatMultiplier: FISHING_CONFIG.catchQuality.greatMultiplier
    };
  }
  return FISHING_CONFIG.catchQuality;
}

// ===========================================
// TRADING POST OPTIONS
// ===========================================

const TRADE_OPTIONS = [
  // === POINTS TRADES ===
  {
    id: 'common_to_points',
    name: 'Sell Common Fish',
    description: 'Trade common fish for points',
    requiredRarity: 'common',
    requiredQuantity: 5,
    rewardType: 'points',
    rewardAmount: 50,
    emoji: '🐟',
    category: 'points'
  },
  {
    id: 'uncommon_to_points',
    name: 'Sell Uncommon Fish',
    description: 'Trade uncommon fish for points',
    requiredRarity: 'uncommon',
    requiredQuantity: 3,
    rewardType: 'points',
    rewardAmount: 100,
    emoji: '🐠',
    category: 'points'
  },
  {
    id: 'rare_to_points',
    name: 'Sell Rare Fish',
    description: 'Trade rare fish for points',
    requiredRarity: 'rare',
    requiredQuantity: 2,
    rewardType: 'points',
    rewardAmount: 200,
    emoji: '🐡',
    category: 'points'
  },
  {
    id: 'epic_to_points',
    name: 'Sell Epic Fish',
    description: 'Trade epic fish for a large point bonus',
    requiredRarity: 'epic',
    requiredQuantity: 1,
    rewardType: 'points',
    // BALANCE UPDATE v5.0: Increased from 600 to 700
    // Rationale: With buffed point generation, epic fish value needed adjustment.
    // 700 vs 3000 legendary = ~4.3x ratio, slightly favoring epic for accessibility.
    rewardAmount: 700,
    emoji: '🦈',
    category: 'points'
  },
  {
    id: 'legendary_to_points',
    name: 'Sell Legendary Fish',
    description: 'Trade a legendary fish for a massive point bonus',
    requiredRarity: 'legendary',
    requiredQuantity: 1,
    rewardType: 'points',
    // BALANCE UPDATE v5.0: Increased from 2500 to 3000
    // Rationale: Legendary fish are rare achievements - reward should feel impactful.
    rewardAmount: 3000,
    emoji: '🐋',
    category: 'points'
  },
  
  // === TICKET TRADES ===
  {
    id: 'common_to_ticket',
    name: 'Roll Ticket',
    description: 'Trade common fish for a single roll ticket',
    requiredRarity: 'common',
    requiredQuantity: 10,
    rewardType: 'rollTickets',
    rewardAmount: 1,
    emoji: '🎟️',
    category: 'tickets'
  },
  {
    id: 'uncommon_to_tickets',
    name: 'Roll Ticket Pack',
    description: 'Trade uncommon fish for roll tickets',
    requiredRarity: 'uncommon',
    requiredQuantity: 5,
    rewardType: 'rollTickets',
    rewardAmount: 2,
    emoji: '🎟️',
    category: 'tickets'
  },
  {
    id: 'rare_to_premium',
    name: 'Premium Ticket',
    description: 'Trade rare fish for a premium ticket (better rates!)',
    requiredRarity: 'rare',
    requiredQuantity: 3,
    rewardType: 'premiumTickets',
    rewardAmount: 1,
    emoji: '🌟',
    category: 'tickets'
  },
  {
    id: 'epic_to_roll_tickets',
    name: 'Epic Roll Bundle',
    description: 'Trade epic fish for roll tickets',
    requiredRarity: 'epic',
    requiredQuantity: 1,
    rewardType: 'rollTickets',
    // BALANCE UPDATE v5.0: Increased from 3 to 4 roll tickets
    // Rationale: Better value proposition vs points trade (700 pts = 7 pulls).
    // 4 tickets = 4 free pulls, more attractive for ticket-focused players.
    rewardAmount: 4,
    emoji: '🎟️',
    category: 'tickets'
  },
  {
    id: 'epic_to_premium',
    name: 'Premium Ticket Pack',
    description: 'Trade epic fish for premium tickets',
    requiredRarity: 'epic',
    requiredQuantity: 2,
    rewardType: 'premiumTickets',
    rewardAmount: 2,
    emoji: '🌟',
    category: 'tickets'
  },
  {
    id: 'legendary_to_premium',
    name: 'Golden Ticket Pack',
    description: 'Trade a legendary fish for premium tickets',
    requiredRarity: 'legendary',
    requiredQuantity: 1,
    rewardType: 'premiumTickets',
    // BALANCE UPDATE v5.0: Increased from 5 to 6 premium tickets
    // Rationale: Legendary fish are ~1% catch rate - reward should be exciting.
    rewardAmount: 6,
    emoji: '✨',
    category: 'tickets'
  },
  
  // === SPECIAL TRADES ===
  {
    id: 'collection_bonus',
    name: 'Complete Collection',
    description: 'Trade one of each rarity for a mega bonus',
    requiredRarity: 'collection',
    requiredQuantity: 1, // 1 of each rarity
    rewardType: 'points',
    rewardAmount: 2500,
    emoji: '🏆',
    category: 'special'
  },
  {
    id: 'collection_tickets',
    name: 'Fisher\'s Treasure',
    description: 'Trade one of each rarity for tickets + premium tickets',
    requiredRarity: 'collection',
    requiredQuantity: 1,
    rewardType: 'mixed',
    rewardAmount: { rollTickets: 5, premiumTickets: 3 },
    emoji: '💎',
    category: 'special'
  }
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Calculate fish totals by rarity from inventory
 * @param {Array} inventory - Array of FishInventory items
 * @returns {Object} - Totals object with rarity keys
 */
function calculateFishTotals(inventory) {
  const totals = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0
  };
  
  inventory.forEach(item => {
    if (totals[item.rarity] !== undefined) {
      totals[item.rarity] += item.quantity;
    }
  });
  
  return totals;
}

/**
 * Calculate rank bonus using logarithmic scaling
 * Provides fairer distribution: small bonuses spread more evenly
 * 
 * @param {number} rank - User's current rank
 * @returns {number} - Bonus autofish limit from rank
 */
function calculateRankBonus(rank) {
  if (rank > 100) return 0;
  
  // Logarithmic scaling: Top 1 gets ~200, Top 10 gets ~100, Top 100 gets ~10
  // Formula: maxBonus * log10(102 - rank) / log10(101)
  const maxBonus = 200;
  const bonus = Math.floor(maxBonus * Math.log10(102 - rank) / Math.log10(101));
  
  return Math.max(0, bonus);
}

/**
 * Calculate autofish daily limit for a user based on rank and premium status
 * 
 * UPDATED: Uses logarithmic rank scaling for fairer distribution.
 * Premium bonus now requires ACTIVE premium status, not just holding tickets.
 * Users get premium bonus if they have consumed premium tickets today OR have 3+ tickets.
 * This prevents hoarding tickets without using them.
 * 
 * @param {number} rank - User's current rank
 * @param {boolean|Object} premiumStatus - Whether user has premium status
 *   - If boolean: legacy mode (has any premium tickets)
 *   - If object: { tickets, usedToday } for proper calculation
 * @param {number} prestigeBonus - Additional limit from prestige level (default 0)
 * @returns {number} - Daily autofish limit
 */
function getAutofishLimit(rank, premiumStatus = false, prestigeBonus = 0) {
  const config = FISHING_CONFIG.autofish;
  let limit = config.baseDailyLimit;
  
  // Apply logarithmic rank bonus (replaces step-based bonuses)
  limit += calculateRankBonus(rank);
  
  // Apply premium multiplier
  // New logic: Premium bonus requires ACTIVE usage or substantial holdings
  let hasPremiumBonus = false;
  if (typeof premiumStatus === 'object' && premiumStatus !== null) {
    // New format: check for active premium
    // Premium if: used premium tickets today OR has 3+ tickets
    hasPremiumBonus = (premiumStatus.usedToday > 0) || (premiumStatus.tickets >= 3);
  } else {
    // Legacy boolean format (backwards compatible)
    hasPremiumBonus = !!premiumStatus;
  }
  
  if (hasPremiumBonus) {
    limit = Math.floor(limit * config.premiumMultiplier);
  }
  
  // Apply prestige bonus (additive, not multiplicative)
  limit += prestigeBonus;
  
  return limit;
}

/**
 * Get today's date string in YYYY-MM-DD format
 * @returns {string}
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if daily data needs to be reset
 * @param {string} storedDate - The date stored in user's daily data
 * @returns {boolean}
 */
function needsDailyReset(storedDate) {
  return storedDate !== getTodayString();
}

/**
 * Get fish available in a specific area
 * @param {string} areaId - Area ID
 * @returns {Array} - Array of fish objects available in that area
 */
function getFishForArea(areaId) {
  const area = FISHING_AREAS[areaId];
  if (!area) return FISH_TYPES; // Fallback to all fish
  
  return FISH_TYPES.filter(fish => area.fishPool.includes(fish.id));
}

/**
 * Select random fish with area and rod bonuses
 * @param {Object} pityData - User's pity counters
 * @param {string} areaId - Current fishing area
 * @param {string} rodId - Current fishing rod
 * @returns {Object} - { fish, pityTriggered, resetPity }
 */
// Rarity hierarchy for fallback selection
const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

/**
 * Get the highest rarity fish available in an area
 * @param {Array} areaFish - Fish available in the area
 * @param {string} targetRarity - The rarity we wanted (for determining reset behavior)
 * @returns {Object|null} - { fish, actualRarity } or null if no fish
 */
function getHighestRarityFish(areaFish, _targetRarity = 'legendary') {
  for (const rarity of RARITY_ORDER) {
    const fishOfRarity = areaFish.filter(f => f.rarity === rarity);
    if (fishOfRarity.length > 0) {
      return {
        fish: fishOfRarity[Math.floor(Math.random() * fishOfRarity.length)],
        actualRarity: rarity
      };
    }
  }
  return null;
}

function selectRandomFishWithBonuses(pityData, areaId = 'pond', rodId = 'basic') {
  const area = FISHING_AREAS[areaId] || FISHING_AREAS.pond;
  const rod = FISHING_RODS[rodId] || FISHING_RODS.basic;
  const areaFish = getFishForArea(areaId);
  
  // Calculate total rarity bonus
  const totalRarityBonus = (area.rarityBonus || 0) + (rod.rarityBonus || 0);
  
  // Check for hard pity first
  const legendaryPity = FISHING_CONFIG.pity.legendary;
  const epicPity = FISHING_CONFIG.pity.epic;
  
  if (pityData && pityData.legendary >= legendaryPity.hardPity) {
    const legendaryFish = areaFish.filter(f => f.rarity === 'legendary');
    if (legendaryFish.length > 0) {
      // Area has legendary fish - give one
      return {
        fish: legendaryFish[Math.floor(Math.random() * legendaryFish.length)],
        pityTriggered: true,
        resetPity: ['legendary', 'epic']
      };
    } else {
      // BUGFIX: Area has no legendary - give highest rarity available and reset pity
      // This prevents pity from exceeding hardPity in areas without legendary fish
      const fallback = getHighestRarityFish(areaFish, 'legendary');
      if (fallback) {
        return {
          fish: fallback.fish,
          pityTriggered: true,
          // Reset legendary pity since we're honoring the pity guarantee (even if with lower rarity)
          // Also reset epic if we gave epic or higher
          resetPity: ['legendary', 'epic'].includes(fallback.actualRarity) 
            ? ['legendary', 'epic'] 
            : ['legendary']
        };
      }
    }
  }
  
  if (pityData && pityData.epic >= epicPity.hardPity) {
    const epicFish = areaFish.filter(f => f.rarity === 'epic');
    if (epicFish.length > 0) {
      // Area has epic fish - give one
      return {
        fish: epicFish[Math.floor(Math.random() * epicFish.length)],
        pityTriggered: true,
        resetPity: ['epic']
      };
    } else {
      // BUGFIX: Area has no epic - give highest rarity available (up to rare) and reset epic pity
      const fallback = getHighestRarityFish(areaFish, 'epic');
      if (fallback && RARITY_ORDER.indexOf(fallback.actualRarity) <= RARITY_ORDER.indexOf('rare')) {
        return {
          fish: fallback.fish,
          pityTriggered: true,
          resetPity: ['epic']
        };
      }
    }
  }
  
  // Calculate adjusted weights with pity and area/rod bonuses
  let adjustedWeights = areaFish.map(fish => {
    let weight = fish.weight;
    
    // Apply pity bonus
    if (fish.rarity === 'legendary' && pityData) {
      weight += calculatePityBonus(pityData, 'legendary');
    } else if (fish.rarity === 'epic' && pityData) {
      weight += calculatePityBonus(pityData, 'epic');
    }
    
    // Apply rarity bonus for rare+ fish
    if (['rare', 'epic', 'legendary'].includes(fish.rarity)) {
      weight *= (1 + totalRarityBonus);
    }
    
    return { ...fish, adjustedWeight: weight };
  });
  
  const totalWeight = adjustedWeights.reduce((sum, f) => sum + f.adjustedWeight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  
  for (const fish of adjustedWeights) {
    cumulative += fish.adjustedWeight;
    if (random < cumulative) {
      let resetPity = [];
      if (fish.rarity === 'legendary') {
        resetPity = ['legendary', 'epic'];
      } else if (fish.rarity === 'epic') {
        resetPity = ['epic'];
      }
      
      return {
        fish: areaFish.find(f => f.id === fish.id),
        pityTriggered: false,
        resetPity
      };
    }
  }
  
  return { fish: areaFish[0], pityTriggered: false, resetPity: [] };
}

// ===========================================
// ACCOUNT LEVEL INTEGRATION (NEW in v3.0)
// ===========================================

/**
 * Get fishing rarity bonus from account level
 * Uses the cumulative bonuses from account level rewards
 *
 * @param {number} accountLevel - User's current account level
 * @returns {number} - Rarity bonus (e.g., 0.05 = +5%)
 */
function getAccountLevelFishingBonus(accountLevel) {
  // Try to get cumulative bonuses from accountLevel config
  // This avoids circular dependency by not requiring at module load
  try {
    const { getCumulativeBonuses } = require('./accountLevel');
    const bonuses = getCumulativeBonuses(accountLevel || 1);
    return bonuses.fishingRarity || 0;
  } catch (e) {
    // Fallback: calculate directly
    let rarityBonus = 0;

    // Level 30: +2% rare fish chance
    if (accountLevel >= 30) rarityBonus += 0.02;
    // Level 100: +5% total (including the 2% from level 30)
    if (accountLevel >= 100) rarityBonus += 0.03;

    return rarityBonus;
  }
}

/**
 * Select random fish with all bonuses including account level
 * Wrapper around selectRandomFishWithBonuses that adds account-level rarity bonus
 *
 * @param {Object} pityData - User's pity counters
 * @param {string} areaId - Current fishing area
 * @param {string} rodId - Current fishing rod
 * @param {number} accountLevel - User's account level
 * @param {number} prestigeLevel - User's fishing prestige level
 * @returns {Object} - { fish, pityTriggered, resetPity, accountBonus }
 */
function selectRandomFishWithAccountBonus(pityData, areaId = 'pond', rodId = 'basic', accountLevel = 1, prestigeLevel = 0) {
  const area = FISHING_AREAS[areaId] || FISHING_AREAS.pond;
  const rod = FISHING_RODS[rodId] || FISHING_RODS.basic;
  const areaFish = getFishForArea(areaId);

  // Calculate total rarity bonus including account level
  const accountBonus = getAccountLevelFishingBonus(accountLevel);

  // Get prestige bonuses if available
  let prestigeRarityBonus = 0;
  try {
    const { getPrestigeBonuses } = require('./fishing/prestige');
    const prestigeBonuses = getPrestigeBonuses(prestigeLevel);
    prestigeRarityBonus = prestigeBonuses.rarityBonus || 0;
  } catch (e) {
    // Prestige module not available, skip
  }

  const totalRarityBonus = (area.rarityBonus || 0) + (rod.rarityBonus || 0) + accountBonus + prestigeRarityBonus;

  // Check for hard pity first (same as selectRandomFishWithBonuses)
  const legendaryPity = FISHING_CONFIG.pity.legendary;
  const epicPity = FISHING_CONFIG.pity.epic;

  if (pityData && pityData.legendary >= legendaryPity.hardPity) {
    const legendaryFish = areaFish.filter(f => f.rarity === 'legendary');
    if (legendaryFish.length > 0) {
      return {
        fish: legendaryFish[Math.floor(Math.random() * legendaryFish.length)],
        pityTriggered: true,
        resetPity: ['legendary', 'epic'],
        accountBonus: accountBonus,
        totalRarityBonus: totalRarityBonus
      };
    }
  }

  if (pityData && pityData.epic >= epicPity.hardPity) {
    const epicFish = areaFish.filter(f => f.rarity === 'epic');
    if (epicFish.length > 0) {
      return {
        fish: epicFish[Math.floor(Math.random() * epicFish.length)],
        pityTriggered: true,
        resetPity: ['epic'],
        accountBonus: accountBonus,
        totalRarityBonus: totalRarityBonus
      };
    }
  }

  // Calculate adjusted weights with pity and all bonuses
  let adjustedWeights = areaFish.map(fish => {
    let weight = fish.weight;

    // Apply pity bonus
    if (fish.rarity === 'legendary' && pityData) {
      weight += calculatePityBonus(pityData, 'legendary');
    } else if (fish.rarity === 'epic' && pityData) {
      weight += calculatePityBonus(pityData, 'epic');
    }

    // Apply total rarity bonus for rare+ fish
    if (['rare', 'epic', 'legendary'].includes(fish.rarity)) {
      weight *= (1 + totalRarityBonus);
    }

    return { ...fish, adjustedWeight: weight };
  });

  const totalWeight = adjustedWeights.reduce((sum, f) => sum + f.adjustedWeight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;

  for (const fish of adjustedWeights) {
    cumulative += fish.adjustedWeight;
    if (random < cumulative) {
      let resetPity = [];
      if (fish.rarity === 'legendary') {
        resetPity = ['legendary', 'epic'];
      } else if (fish.rarity === 'epic') {
        resetPity = ['epic'];
      }

      return {
        fish: areaFish.find(f => f.id === fish.id),
        pityTriggered: false,
        resetPity,
        accountBonus: accountBonus,
        totalRarityBonus: totalRarityBonus
      };
    }
  }

  return {
    fish: areaFish[0],
    pityTriggered: false,
    resetPity: [],
    accountBonus: accountBonus,
    totalRarityBonus: totalRarityBonus
  };
}

module.exports = {
  FISHING_CONFIG,
  FISH_TYPES,
  TRADE_OPTIONS,
  FISHING_AREAS,
  FISHING_RODS,
  DAILY_CHALLENGES,
  selectRandomFish,
  selectRandomFishWithBonuses,
  calculateFishTotals,
  getCatchThresholds,
  calculatePityBonus,
  getAutofishLimit,
  calculateRankBonus,
  getTodayString,
  needsDailyReset,
  getFishForArea,
  generateDailyChallenges,
  // New in v3.0
  getAccountLevelFishingBonus,
  selectRandomFishWithAccountBonus
};