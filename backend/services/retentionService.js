/**
 * Retention Systems Service
 *
 * Handles long-term player retention features:
 * - Mastery tracks (character and collection progression)
 * - Rest and return bonuses
 */

const {
  MASTERY_TRACKS,
  REST_AND_RETURN_BONUS,
  CHECK_IN_EFFICIENCY
} = require('../config/gameDesign');

// ===========================================
// MASTERY TRACKS
// ===========================================

/**
 * Get character mastery info
 * @param {Object} user - User object
 * @param {number} characterId - Character ID
 * @returns {Object} - Mastery state
 */
function getCharacterMastery(user, characterId) {
  const masteryData = user.characterMastery || {};
  const charMastery = masteryData[characterId] || { xp: 0, level: 1, claimed: [] };

  const config = MASTERY_TRACKS.characterMastery;
  const currentLevel = charMastery.level;
  const currentXp = charMastery.xp;

  // Find next level requirements
  const nextLevelData = config.levels[currentLevel]; // Array is 0-indexed, level 1 = index 1
  const xpForNextLevel = nextLevelData?.requirement || Infinity;
  const xpProgress = currentLevel < config.maxLevel
    ? Math.min(100, (currentXp / xpForNextLevel) * 100)
    : 100;

  // Build level info
  const levels = config.levels.map((level, index) => ({
    level: index + 1,
    requirement: level.requirement,
    reward: level.reward,
    unlocked: charMastery.level > index,
    claimed: charMastery.claimed.includes(index)
  }));

  return {
    characterId,
    currentLevel: charMastery.level,
    currentXp: charMastery.xp,
    xpForNextLevel,
    xpProgress,
    maxLevel: config.maxLevel,
    isMaxLevel: charMastery.level >= config.maxLevel,
    levels,
    xpSources: config.xpSources
  };
}

/**
 * Add mastery XP to a character
 * @param {Object} user - User object
 * @param {number} characterId - Character ID
 * @param {string} source - XP source
 * @param {number} multiplier - XP multiplier (default 1)
 * @returns {Object} - XP gain result
 */
function addMasteryXp(user, characterId, source, multiplier = 1) {
  const config = MASTERY_TRACKS.characterMastery;
  const baseXp = config.xpSources[source] || 0;
  const xpToAdd = Math.floor(baseXp * multiplier);

  if (xpToAdd <= 0) {
    return { success: false, xpAdded: 0 };
  }

  const masteryData = user.characterMastery || {};
  const charMastery = masteryData[characterId] || { xp: 0, level: 1, claimed: [] };

  charMastery.xp += xpToAdd;

  // Check for level ups
  const levelUps = [];
  while (charMastery.level < config.maxLevel) {
    const nextLevel = config.levels[charMastery.level];
    if (!nextLevel || charMastery.xp < nextLevel.requirement) break;

    charMastery.level += 1;
    charMastery.xp -= nextLevel.requirement;
    levelUps.push({
      newLevel: charMastery.level,
      reward: nextLevel.reward
    });
  }

  masteryData[characterId] = charMastery;
  user.characterMastery = masteryData;

  return {
    success: true,
    xpAdded: xpToAdd,
    newXp: charMastery.xp,
    newLevel: charMastery.level,
    levelUps
  };
}

/**
 * Get fish codex progress
 * @param {Object} user - User object
 * @returns {Object} - Codex state
 */
function getFishCodex(user) {
  const codex = user.fishCodex || { discovered: [], biomeProgress: {} };
  const config = MASTERY_TRACKS.fishCodex;

  const discoveredCount = codex.discovered.length;

  // Find next milestone
  const milestones = config.milestones.map(milestone => ({
    ...milestone,
    unlocked: discoveredCount >= milestone.count,
    claimed: codex.claimedMilestones?.includes(milestone.count) || false
  }));

  const nextMilestone = milestones.find(m => !m.unlocked);

  // Biome completion
  const biomes = Object.entries(config.biomes).map(([biomeId, biome]) => {
    const biomeProgress = codex.biomeProgress[biomeId] || { discovered: 0, total: 0 };
    return {
      id: biomeId,
      bonus: biome.bonus,
      progress: biomeProgress.total > 0
        ? biomeProgress.discovered / biomeProgress.total
        : 0,
      completed: biomeProgress.discovered >= biomeProgress.total && biomeProgress.total > 0
    };
  });

  return {
    discoveredCount,
    totalSpecies: config.totalSpecies,
    progress: Math.min(100, (discoveredCount / config.totalSpecies) * 100),
    milestones,
    nextMilestone,
    biomes,
    recentDiscoveries: codex.recentDiscoveries || []
  };
}

/**
 * Discover a new fish species
 * @param {Object} user - User object
 * @param {string} fishId - Fish ID discovered
 * @param {string} biomeId - Biome where discovered
 * @returns {Object} - Discovery result
 */
function discoverFishSpecies(user, fishId, biomeId) {
  const codex = user.fishCodex || {
    discovered: [],
    biomeProgress: {},
    claimedMilestones: [],
    recentDiscoveries: []
  };

  if (codex.discovered.includes(fishId)) {
    return { success: true, isNew: false };
  }

  // New discovery!
  codex.discovered.push(fishId);

  // Update biome progress
  if (biomeId) {
    const biomeProgress = codex.biomeProgress[biomeId] || { discovered: 0, total: 0 };
    biomeProgress.discovered += 1;
    codex.biomeProgress[biomeId] = biomeProgress;
  }

  // Add to recent
  codex.recentDiscoveries = codex.recentDiscoveries || [];
  codex.recentDiscoveries.unshift({
    fishId,
    biomeId,
    timestamp: new Date().toISOString()
  });
  codex.recentDiscoveries = codex.recentDiscoveries.slice(0, 10); // Keep last 10

  user.fishCodex = codex;

  // Check for milestone unlocks
  const config = MASTERY_TRACKS.fishCodex;
  const newMilestones = config.milestones.filter(m =>
    codex.discovered.length >= m.count &&
    !codex.claimedMilestones?.includes(m.count)
  );

  return {
    success: true,
    isNew: true,
    fishId,
    newDiscoveryCount: codex.discovered.length,
    unlockedMilestones: newMilestones.map(m => ({
      count: m.count,
      reward: m.reward
    }))
  };
}

// ===========================================
// REST AND RETURN BONUSES
// ===========================================

/**
 * Check for rest and return bonus
 * @param {Object} user - User object
 * @returns {Object|null} - Bonus to apply or null
 */
function checkRestAndReturnBonus(user) {
  if (!REST_AND_RETURN_BONUS.enabled) {
    return null;
  }

  const lastLogin = user.lastLogin;
  if (!lastLogin) {
    return null;
  }

  const daysSinceLogin = (Date.now() - new Date(lastLogin).getTime()) /
    (1000 * 60 * 60 * 24);

  // Find matching tier
  for (const tier of REST_AND_RETURN_BONUS.tiers) {
    if (daysSinceLogin >= tier.minDays && daysSinceLogin < tier.maxDays) {
      return {
        daysAway: Math.floor(daysSinceLogin),
        bonus: tier.bonus,
        claimed: false
      };
    }
  }

  // Check if beyond max tier
  const maxTier = REST_AND_RETURN_BONUS.tiers[REST_AND_RETURN_BONUS.tiers.length - 1];
  if (daysSinceLogin >= maxTier.minDays) {
    return {
      daysAway: Math.floor(daysSinceLogin),
      bonus: maxTier.bonus,
      claimed: false
    };
  }

  return null;
}

/**
 * Claim rest and return bonus
 * @param {Object} user - User object
 * @param {Object} bonus - Bonus to claim
 * @returns {Object} - Claim result
 */
function claimRestAndReturnBonus(user, bonus) {
  if (!bonus || bonus.claimed) {
    return { success: false, error: 'No bonus to claim' };
  }

  const rewards = bonus.bonus;
  const applied = {};

  if (rewards.points) {
    user.points = (user.points || 0) + rewards.points;
    applied.points = rewards.points;
  }

  if (rewards.rollTickets) {
    user.rollTickets = (user.rollTickets || 0) + rewards.rollTickets;
    applied.rollTickets = rewards.rollTickets;
  }

  if (rewards.premiumTickets) {
    user.premiumTickets = (user.premiumTickets || 0) + rewards.premiumTickets;
    applied.premiumTickets = rewards.premiumTickets;
  }

  if (rewards.characterSelector) {
    const selectors = user.characterSelectors || [];
    selectors.push({
      rarity: rewards.characterSelector,
      obtained: new Date().toISOString(),
      source: 'return_bonus',
      used: false
    });
    user.characterSelectors = selectors;
    applied.characterSelector = rewards.characterSelector;
  }

  // Mark as claimed for this session
  user.returnBonusClaimed = new Date().toISOString();

  return {
    success: true,
    applied,
    message: rewards.message
  };
}

/**
 * Calculate efficiency based on check-in interval
 * @param {Object} user - User object
 * @returns {Object} - Efficiency info
 */
function getCheckInEfficiency(user) {
  const lastClaim = user.dojoLastClaim;
  if (!lastClaim) {
    return { efficiency: 1.0, description: 'First claim' };
  }

  const hoursSinceClaim = (Date.now() - new Date(lastClaim).getTime()) /
    (1000 * 60 * 60);

  // Find matching interval
  for (const interval of CHECK_IN_EFFICIENCY.intervals) {
    if (hoursSinceClaim <= interval.hours) {
      return {
        efficiency: interval.efficiency,
        description: interval.description,
        hoursSinceClaim: Math.floor(hoursSinceClaim)
      };
    }
  }

  // Beyond all intervals - minimum efficiency
  return {
    efficiency: CHECK_IN_EFFICIENCY.minimumEfficiency,
    description: 'Welcome back',
    hoursSinceClaim: Math.floor(hoursSinceClaim)
  };
}

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  // Mastery
  getCharacterMastery,
  addMasteryXp,
  getFishCodex,
  discoverFishSpecies,

  // Rest & Return
  checkRestAndReturnBonus,
  claimRestAndReturnBonus,
  getCheckInEfficiency
};
