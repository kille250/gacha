/**
 * Retention Systems Service
 *
 * Handles long-term player retention features:
 * - Weekly voyages (themed weekly challenges)
 * - Mastery tracks (character and collection progression)
 * - Daily activity menu (flexible daily objectives)
 * - Rest and return bonuses
 */

const {
  WEEKLY_VOYAGE_CONFIG,
  DAILY_ACTIVITY_MENU,
  MASTERY_TRACKS,
  REST_AND_RETURN_BONUS,
  CHECK_IN_EFFICIENCY
} = require('../config/gameDesign');

// ===========================================
// WEEKLY VOYAGE SYSTEM
// ===========================================

/**
 * Get current week number (for voyage rotation)
 * @returns {number} - Week number since epoch
 */
function getCurrentWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 604800000; // ms in a week
  return Math.floor(diff / oneWeek);
}

/**
 * Get the active voyage for this week
 * @param {Object} user - User object
 * @returns {Object} - Active voyage with progress
 */
function getActiveVoyage(user) {
  const weekNumber = getCurrentWeekNumber();
  const voyages = WEEKLY_VOYAGE_CONFIG.voyageTypes;

  // Rotate through voyages
  const voyageIndex = weekNumber % voyages.length;
  const voyageTemplate = voyages[voyageIndex];

  // Get user's progress for this voyage
  const userVoyages = user.weeklyVoyages || {};
  const thisWeekVoyage = userVoyages[weekNumber] || {
    voyageId: voyageTemplate.id,
    started: new Date().toISOString(),
    progress: [0, 0, 0], // Progress for each chapter
    chaptersCompleted: [],
    voyageCompleted: false,
    rewardsClaimed: []
  };

  // Determine current chapter based on day of week
  const dayOfWeek = new Date().getDay(); // 0-6
  let currentChapter = 0;
  if (dayOfWeek >= 5) currentChapter = 2; // Days 5-7 = chapter 3
  else if (dayOfWeek >= 3) currentChapter = 1; // Days 3-4 = chapter 2
  // Days 1-2 = chapter 1

  // Build chapter info
  const chapters = voyageTemplate.chapters.map((chapter, index) => {
    const progress = thisWeekVoyage.progress[index] || 0;
    const isCompleted = thisWeekVoyage.chaptersCompleted.includes(index);
    const isCurrent = index === currentChapter && !thisWeekVoyage.voyageCompleted;
    const canClaim = progress >= chapter.target && !isCompleted;

    return {
      index,
      ...chapter,
      progress,
      isCompleted,
      isCurrent,
      canClaim,
      reward: voyageTemplate.rewards[`chapter${index + 1}`]
    };
  });

  // Check if all chapters are complete
  const allChaptersComplete = chapters.every(c => c.isCompleted);
  const canClaimVoyageReward = allChaptersComplete &&
    !thisWeekVoyage.rewardsClaimed.includes('complete');

  return {
    weekNumber,
    voyage: {
      id: voyageTemplate.id,
      name: voyageTemplate.name,
      theme: voyageTemplate.theme
    },
    chapters,
    currentChapter,
    allChaptersComplete,
    canClaimVoyageReward,
    voyageReward: voyageTemplate.rewards.complete,
    timeRemaining: getTimeUntilWeekEnd(),
    userProgress: thisWeekVoyage
  };
}

/**
 * Get time until week ends (for voyage expiry)
 * @returns {Object} - Time remaining
 */
function getTimeUntilWeekEnd() {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(0, 0, 0, 0);

  const msRemaining = endOfWeek - now;
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const daysRemaining = Math.floor(hoursRemaining / 24);

  return {
    ms: msRemaining,
    hours: hoursRemaining,
    days: daysRemaining,
    formatted: daysRemaining > 0 ? `${daysRemaining}d ${hoursRemaining % 24}h` : `${hoursRemaining}h`
  };
}

/**
 * Update voyage progress
 * @param {Object} user - User object
 * @param {string} objectiveType - Type of objective completed
 * @param {number} amount - Amount to add
 * @returns {Object} - Progress update result
 */
function updateVoyageProgress(user, objectiveType, amount = 1) {
  const weekNumber = getCurrentWeekNumber();
  const voyages = WEEKLY_VOYAGE_CONFIG.voyageTypes;
  const voyageIndex = weekNumber % voyages.length;
  const voyageTemplate = voyages[voyageIndex];

  const userVoyages = user.weeklyVoyages || {};
  const thisWeekVoyage = userVoyages[weekNumber] || {
    voyageId: voyageTemplate.id,
    started: new Date().toISOString(),
    progress: [0, 0, 0],
    chaptersCompleted: [],
    voyageCompleted: false,
    rewardsClaimed: []
  };

  // Find matching chapters
  const updates = [];
  voyageTemplate.chapters.forEach((chapter, index) => {
    if (chapter.objective === objectiveType &&
        !thisWeekVoyage.chaptersCompleted.includes(index)) {
      thisWeekVoyage.progress[index] = (thisWeekVoyage.progress[index] || 0) + amount;

      const newProgress = thisWeekVoyage.progress[index];
      const completed = newProgress >= chapter.target;

      updates.push({
        chapter: index + 1,
        objective: chapter.description,
        progress: newProgress,
        target: chapter.target,
        completed
      });
    }
  });

  userVoyages[weekNumber] = thisWeekVoyage;
  user.weeklyVoyages = userVoyages;

  return {
    updated: updates.length > 0,
    updates
  };
}

/**
 * Claim voyage chapter reward
 * @param {Object} user - User object
 * @param {number} chapterIndex - Chapter to claim (0-2)
 * @returns {Object} - Claim result
 */
function claimVoyageChapterReward(user, chapterIndex) {
  const weekNumber = getCurrentWeekNumber();
  const voyages = WEEKLY_VOYAGE_CONFIG.voyageTypes;
  const voyageIndex = weekNumber % voyages.length;
  const voyageTemplate = voyages[voyageIndex];

  const userVoyages = user.weeklyVoyages || {};
  const thisWeekVoyage = userVoyages[weekNumber];

  if (!thisWeekVoyage) {
    return { success: false, error: 'No active voyage' };
  }

  const chapter = voyageTemplate.chapters[chapterIndex];
  if (!chapter) {
    return { success: false, error: 'Invalid chapter' };
  }

  const progress = thisWeekVoyage.progress[chapterIndex] || 0;
  if (progress < chapter.target) {
    return { success: false, error: 'Chapter not complete' };
  }

  if (thisWeekVoyage.chaptersCompleted.includes(chapterIndex)) {
    return { success: false, error: 'Already claimed' };
  }

  // Mark as claimed
  thisWeekVoyage.chaptersCompleted.push(chapterIndex);
  userVoyages[weekNumber] = thisWeekVoyage;
  user.weeklyVoyages = userVoyages;

  // Get reward
  const rewardKey = `chapter${chapterIndex + 1}`;
  const reward = voyageTemplate.rewards[rewardKey];

  // Apply reward
  const applied = applyVoyageReward(user, reward);

  return {
    success: true,
    chapter: chapterIndex + 1,
    reward,
    applied,
    message: `Chapter ${chapterIndex + 1} complete!`
  };
}

/**
 * Claim voyage completion reward
 * @param {Object} user - User object
 * @returns {Object} - Claim result
 */
function claimVoyageCompletionReward(user) {
  const weekNumber = getCurrentWeekNumber();
  const voyages = WEEKLY_VOYAGE_CONFIG.voyageTypes;
  const voyageIndex = weekNumber % voyages.length;
  const voyageTemplate = voyages[voyageIndex];

  const userVoyages = user.weeklyVoyages || {};
  const thisWeekVoyage = userVoyages[weekNumber];

  if (!thisWeekVoyage) {
    return { success: false, error: 'No active voyage' };
  }

  // Check all chapters complete
  if (thisWeekVoyage.chaptersCompleted.length < 3) {
    return { success: false, error: 'Not all chapters complete' };
  }

  if (thisWeekVoyage.rewardsClaimed.includes('complete')) {
    return { success: false, error: 'Already claimed' };
  }

  // Mark as claimed
  thisWeekVoyage.rewardsClaimed.push('complete');
  thisWeekVoyage.voyageCompleted = true;
  userVoyages[weekNumber] = thisWeekVoyage;
  user.weeklyVoyages = userVoyages;

  const reward = voyageTemplate.rewards.complete;
  const applied = applyVoyageReward(user, reward);

  return {
    success: true,
    reward,
    applied,
    message: 'Voyage complete! Treasure chest opened!'
  };
}

/**
 * Apply voyage reward to user
 * @param {Object} user - User object
 * @param {Object} reward - Reward object
 * @returns {Object} - Applied rewards
 */
function applyVoyageReward(user, reward) {
  const applied = {};

  if (reward.points) {
    user.points = (user.points || 0) + reward.points;
    applied.points = reward.points;
  }

  if (reward.spiritEssence) {
    user.points = (user.points || 0) + reward.spiritEssence;
    applied.spiritEssence = reward.spiritEssence;
  }

  if (reward.rollTickets) {
    user.rollTickets = (user.rollTickets || 0) + reward.rollTickets;
    applied.rollTickets = reward.rollTickets;
  }

  if (reward.premiumTickets) {
    user.premiumTickets = (user.premiumTickets || 0) + reward.premiumTickets;
    applied.premiumTickets = reward.premiumTickets;
  }

  if (reward.weeklyBannerTicket) {
    user.weeklyBannerTickets = (user.weeklyBannerTickets || 0) + reward.weeklyBannerTicket;
    applied.weeklyBannerTicket = reward.weeklyBannerTicket;
  }

  if (reward.voyageChest) {
    // Voyage chest contains random premium rewards
    const chestContents = openVoyageChest();
    Object.assign(applied, applyVoyageReward(user, chestContents));
    applied.voyageChestContents = chestContents;
  }

  if (reward.item) {
    const items = user.items || [];
    items.push({ id: reward.item, obtained: new Date().toISOString() });
    user.items = items;
    applied.item = reward.item;
  }

  if (reward.characterSelector) {
    const selectors = user.characterSelectors || [];
    selectors.push({
      rarity: reward.characterSelector,
      obtained: new Date().toISOString(),
      source: 'voyage',
      used: false
    });
    user.characterSelectors = selectors;
    applied.characterSelector = reward.characterSelector;
  }

  return applied;
}

/**
 * Open voyage chest for random rewards
 * @returns {Object} - Chest contents
 */
function openVoyageChest() {
  const roll = Math.random();

  if (roll < 0.1) {
    // 10% - Premium tickets
    return { premiumTickets: 3 };
  } else if (roll < 0.3) {
    // 20% - Roll tickets
    return { rollTickets: 5 };
  } else if (roll < 0.5) {
    // 20% - Large points
    return { points: 2000 };
  } else if (roll < 0.7) {
    // 20% - Legendary bait
    return { item: 'legendary_bait_x2' };
  } else {
    // 30% - Points + tickets combo
    return { points: 1000, rollTickets: 2 };
  }
}

// ===========================================
// DAILY ACTIVITY MENU
// ===========================================

/**
 * Get today's daily activity menu
 * @param {Object} user - User object
 * @returns {Object} - Daily menu with progress
 */
function getDailyActivityMenu(user) {
  const today = new Date().toISOString().split('T')[0];
  const userDaily = user.dailyActivities || {};
  const todayData = userDaily[today] || {
    generated: today,
    activities: generateDailyActivities(),
    completed: [],
    bonusCompleted: [],
    dailyBonusClaimed: false
  };

  // Ensure activities are saved
  if (!userDaily[today]) {
    userDaily[today] = todayData;
    user.dailyActivities = userDaily;
  }

  // Build activity status
  const activities = todayData.activities.map(activityId => {
    const activity = DAILY_ACTIVITY_MENU.activities.find(a => a.id === activityId);
    const isCompleted = todayData.completed.includes(activityId);

    return {
      id: activityId,
      name: activity?.name || activityId,
      weight: activity?.weight || 1,
      isCompleted,
      progress: getActivityProgress(user, activityId, today)
    };
  });

  // Bonus objectives
  const bonusObjectives = DAILY_ACTIVITY_MENU.bonusObjectives.map(bonus => ({
    ...bonus,
    isCompleted: todayData.bonusCompleted.includes(bonus.id)
  }));

  // Can claim daily bonus?
  const completedCount = todayData.completed.length;
  const canClaimDaily = completedCount >= DAILY_ACTIVITY_MENU.requiredActivities &&
    !todayData.dailyBonusClaimed;

  return {
    date: today,
    activities,
    bonusObjectives,
    completedCount,
    requiredCount: DAILY_ACTIVITY_MENU.requiredActivities,
    canClaimDaily,
    dailyBonusClaimed: todayData.dailyBonusClaimed,
    dailyBonus: DAILY_ACTIVITY_MENU.dailyBonus,
    bonusReward: DAILY_ACTIVITY_MENU.bonusReward
  };
}

/**
 * Generate random daily activities
 * @returns {Array} - Activity IDs for today
 */
function generateDailyActivities() {
  const allActivities = DAILY_ACTIVITY_MENU.activities;

  // Select activities based on weight (more variety)
  const selected = [];
  const shuffled = [...allActivities].sort(() => Math.random() - 0.5);

  // Pick first 6 unique activities
  for (const activity of shuffled) {
    if (selected.length >= 6) break;
    selected.push(activity.id);
  }

  return selected;
}

/**
 * Get progress for a specific activity
 * @param {Object} user - User object
 * @param {string} activityId - Activity ID
 * @param {string} today - Today's date string
 * @returns {Object} - Progress info
 */
function getActivityProgress(user, activityId, _today) {
  // This would integrate with other systems to check actual progress
  // For now, return placeholder
  switch (activityId) {
    case 'collect_dojo':
      return { current: user.dojoClaimsToday || 0, target: 1 };
    case 'catch_10_fish':
      return { current: user.fishingDaily?.catches || 0, target: 10 };
    case 'complete_training':
      return { current: user.trainingSessionsToday || 0, target: 1 };
    case 'perfect_catch':
      return { current: user.fishingDaily?.perfectCatches || 0, target: 1 };
    default:
      return { current: 0, target: 1 };
  }
}

/**
 * Complete a daily activity
 * @param {Object} user - User object
 * @param {string} activityId - Activity completed
 * @returns {Object} - Completion result
 */
function completeDailyActivity(user, activityId) {
  const today = new Date().toISOString().split('T')[0];
  const userDaily = user.dailyActivities || {};
  const todayData = userDaily[today] || {
    generated: today,
    activities: generateDailyActivities(),
    completed: [],
    bonusCompleted: [],
    dailyBonusClaimed: false
  };

  if (!todayData.activities.includes(activityId)) {
    return { success: false, error: 'Activity not in today\'s menu' };
  }

  if (todayData.completed.includes(activityId)) {
    return { success: false, error: 'Already completed' };
  }

  todayData.completed.push(activityId);
  userDaily[today] = todayData;
  user.dailyActivities = userDaily;

  const completedCount = todayData.completed.length;
  const canClaimDaily = completedCount >= DAILY_ACTIVITY_MENU.requiredActivities;

  return {
    success: true,
    activityId,
    completedCount,
    canClaimDaily,
    message: `Activity completed! (${completedCount}/${DAILY_ACTIVITY_MENU.requiredActivities})`
  };
}

/**
 * Claim daily bonus
 * @param {Object} user - User object
 * @returns {Object} - Claim result
 */
function claimDailyBonus(user) {
  const today = new Date().toISOString().split('T')[0];
  const userDaily = user.dailyActivities || {};
  const todayData = userDaily[today];

  if (!todayData) {
    return { success: false, error: 'No daily data' };
  }

  if (todayData.completed.length < DAILY_ACTIVITY_MENU.requiredActivities) {
    return { success: false, error: 'Not enough activities completed' };
  }

  if (todayData.dailyBonusClaimed) {
    return { success: false, error: 'Already claimed' };
  }

  todayData.dailyBonusClaimed = true;
  userDaily[today] = todayData;
  user.dailyActivities = userDaily;

  // Apply rewards
  const bonus = DAILY_ACTIVITY_MENU.dailyBonus;
  user.points = (user.points || 0) + bonus.points;
  user.rollTickets = (user.rollTickets || 0) + bonus.rollTickets;

  return {
    success: true,
    reward: bonus,
    message: 'Daily bonus claimed!'
  };
}

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
  // Weekly Voyages
  getCurrentWeekNumber,
  getActiveVoyage,
  getTimeUntilWeekEnd,
  updateVoyageProgress,
  claimVoyageChapterReward,
  claimVoyageCompletionReward,

  // Daily Activities
  getDailyActivityMenu,
  completeDailyActivity,
  claimDailyBonus,

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
