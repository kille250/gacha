/**
 * Essence Tap Service
 *
 * Business logic for the Essence Tap clicker minigame.
 * Handles state management, calculations, and integrations.
 */

const {
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
} = require('../config/essenceTap');

const accountLevelService = require('./accountLevelService');

/**
 * Get initial clicker state for a new user
 * @returns {Object} Initial clicker state
 */
function getInitialState() {
  return {
    essence: 0,
    lifetimeEssence: 0,
    totalClicks: 0,
    totalCrits: 0,

    // Generators: { generatorId: count }
    generators: {},

    // Purchased upgrades: array of upgrade IDs
    purchasedUpgrades: [],

    // Prestige
    prestigeLevel: 0,
    prestigeShards: 0,
    lifetimeShards: 0,
    prestigeUpgrades: {}, // { upgradeId: level }

    // Assigned characters for bonuses
    assignedCharacters: [],

    // Daily progress
    daily: {
      date: null,
      clicks: 0,
      crits: 0,
      essenceEarned: 0,
      generatorsBought: 0,
      completedChallenges: []
    },

    // Milestones claimed
    claimedMilestones: [],

    // Stats
    stats: {
      totalGeneratorsBought: 0,
      totalUpgradesPurchased: 0,
      highestCombo: 0,
      goldenEssenceClicks: 0
    },

    // Timestamps
    lastOnlineTimestamp: Date.now(),
    lastSaveTimestamp: Date.now(),
    createdAt: Date.now()
  };
}

/**
 * Calculate the cost of the next generator purchase
 * @param {string} generatorId - Generator ID
 * @param {number} owned - Number currently owned
 * @returns {number} Cost for next purchase
 */
function getGeneratorCost(generatorId, owned) {
  const generator = GENERATORS.find(g => g.id === generatorId);
  if (!generator) return Infinity;

  return Math.floor(generator.baseCost * Math.pow(generator.costMultiplier, owned));
}

/**
 * Calculate cost to buy multiple generators at once
 * @param {string} generatorId - Generator ID
 * @param {number} owned - Number currently owned
 * @param {number} count - Number to buy
 * @returns {number} Total cost
 */
function getBulkGeneratorCost(generatorId, owned, count) {
  const generator = GENERATORS.find(g => g.id === generatorId);
  if (!generator) return Infinity;

  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(generator.baseCost * Math.pow(generator.costMultiplier, owned + i));
  }
  return total;
}

/**
 * Calculate maximum generators purchasable with given essence
 * @param {string} generatorId - Generator ID
 * @param {number} owned - Number currently owned
 * @param {number} essence - Available essence
 * @returns {number} Maximum purchasable
 */
function getMaxPurchasable(generatorId, owned, essence) {
  let count = 0;
  let cost = 0;

  while (true) {
    const nextCost = getGeneratorCost(generatorId, owned + count);
    if (cost + nextCost > essence) break;
    cost += nextCost;
    count++;
    if (count > 1000) break; // Safety limit
  }

  return count;
}

/**
 * Calculate total click power for a state
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {number} Total click power
 */
function calculateClickPower(state, characters = []) {
  let power = GAME_CONFIG.baseClickPower;

  // Add from purchased click upgrades
  for (const upgradeId of state.purchasedUpgrades) {
    const upgrade = CLICK_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade && upgrade.type === 'click_power') {
      power += upgrade.bonus;
    }
  }

  // Add from prestige upgrades
  const prestigeClick = state.prestigeUpgrades?.prestige_click || 0;
  const prestigeUpgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === 'prestige_click');
  if (prestigeUpgrade) {
    power += prestigeClick * prestigeUpgrade.bonusPerLevel;
  }

  // Apply character bonuses
  const characterMultiplier = calculateCharacterBonus(state, characters);
  power *= characterMultiplier;

  // Apply global multipliers
  const globalMult = calculateGlobalMultiplier(state);
  power *= globalMult;

  // Apply prestige shard bonus
  const shardBonus = 1 + Math.min(state.lifetimeShards || 0, PRESTIGE_CONFIG.maxEffectiveShards) * PRESTIGE_CONFIG.shardMultiplier;
  power *= shardBonus;

  return Math.floor(power);
}

/**
 * Calculate critical hit chance
 * @param {Object} state - Clicker state
 * @returns {number} Crit chance (0-1)
 */
function calculateCritChance(state) {
  let chance = GAME_CONFIG.baseCritChance;

  // Add from purchased crit upgrades
  for (const upgradeId of state.purchasedUpgrades) {
    const upgrade = CLICK_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade && upgrade.type === 'crit_chance') {
      chance += upgrade.bonus;
    }
  }

  // Add from prestige upgrades
  const prestigeCrit = state.prestigeUpgrades?.prestige_crit || 0;
  const prestigeUpgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === 'prestige_crit');
  if (prestigeUpgrade) {
    chance += prestigeCrit * prestigeUpgrade.bonusPerLevel;
  }

  return Math.min(chance, 0.9); // Cap at 90%
}

/**
 * Calculate critical hit multiplier
 * @param {Object} state - Clicker state
 * @returns {number} Crit multiplier
 */
function calculateCritMultiplier(state) {
  let mult = GAME_CONFIG.baseCritMultiplier;

  // Add from purchased crit multiplier upgrades
  for (const upgradeId of state.purchasedUpgrades) {
    const upgrade = CLICK_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade && upgrade.type === 'crit_multiplier') {
      mult += upgrade.bonus;
    }
  }

  return mult;
}

/**
 * Calculate production per second from generators
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {number} Essence per second
 */
function calculateProductionPerSecond(state, characters = []) {
  let total = 0;

  // Calculate base production for each generator type
  for (const [generatorId, count] of Object.entries(state.generators || {})) {
    if (count <= 0) continue;

    const generator = GENERATORS.find(g => g.id === generatorId);
    if (!generator) continue;

    let output = generator.baseOutput * count;

    // Apply generator-specific upgrades
    for (const upgradeId of state.purchasedUpgrades) {
      const upgrade = GENERATOR_UPGRADES.find(u => u.id === upgradeId);
      if (upgrade && upgrade.generatorId === generatorId) {
        output *= upgrade.multiplier;
      }
    }

    // Apply synergy bonuses
    for (const upgradeId of state.purchasedUpgrades) {
      const synergy = SYNERGY_UPGRADES.find(u => u.id === upgradeId);
      if (synergy && synergy.targetGenerator === generatorId) {
        const sourceCount = state.generators[synergy.sourceGenerator] || 0;
        output *= (1 + sourceCount * synergy.bonusPerSource);
      }
    }

    total += output;
  }

  // Apply global multipliers
  const globalMult = calculateGlobalMultiplier(state);
  total *= globalMult;

  // Apply character bonuses
  const characterMultiplier = calculateCharacterBonus(state, characters);
  total *= characterMultiplier;

  // Apply prestige shard bonus
  const shardBonus = 1 + Math.min(state.lifetimeShards || 0, PRESTIGE_CONFIG.maxEffectiveShards) * PRESTIGE_CONFIG.shardMultiplier;
  total *= shardBonus;

  // Apply prestige production upgrade
  const prestigeProd = state.prestigeUpgrades?.prestige_production || 0;
  const prestigeUpgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === 'prestige_production');
  if (prestigeUpgrade) {
    total *= (1 + prestigeProd * prestigeUpgrade.bonusPerLevel);
  }

  return total;
}

/**
 * Calculate global multiplier from upgrades
 * @param {Object} state - Clicker state
 * @returns {number} Global multiplier
 */
function calculateGlobalMultiplier(state) {
  let mult = 1;

  for (const upgradeId of state.purchasedUpgrades) {
    const upgrade = GLOBAL_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade) {
      mult *= upgrade.multiplier;
    }
  }

  return mult;
}

/**
 * Calculate character bonus multiplier
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {number} Character bonus multiplier
 */
function calculateCharacterBonus(state, characters = []) {
  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return 1;
  }

  let bonus = 1;

  for (const charId of state.assignedCharacters.slice(0, GAME_CONFIG.maxAssignedCharacters)) {
    const char = characters.find(c => c.id === charId || c.characterId === charId);
    if (char) {
      const rarity = char.rarity?.toLowerCase() || 'common';
      bonus += GAME_CONFIG.characterBonuses[rarity] || 0.05;
    }
  }

  return bonus;
}

/**
 * Calculate offline progress
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {Object} Offline progress data
 */
function calculateOfflineProgress(state, characters = []) {
  const now = Date.now();
  const lastOnline = state.lastOnlineTimestamp || now;
  const elapsedMs = Math.max(0, now - lastOnline);
  const elapsedHours = Math.min(elapsedMs / (1000 * 60 * 60), GAME_CONFIG.maxOfflineHours);

  if (elapsedHours < 0.01) { // Less than ~36 seconds
    return { essenceEarned: 0, hoursAway: 0 };
  }

  const productionPerSecond = calculateProductionPerSecond(state, characters);

  // Base offline efficiency
  let offlineEfficiency = GAME_CONFIG.offlineEfficiency;

  // Add prestige offline bonus
  const prestigeOffline = state.prestigeUpgrades?.prestige_offline || 0;
  const prestigeUpgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === 'prestige_offline');
  if (prestigeUpgrade) {
    offlineEfficiency += prestigeOffline * prestigeUpgrade.bonusPerLevel;
  }

  // Cap at 100%
  offlineEfficiency = Math.min(offlineEfficiency, 1.0);

  const essenceEarned = Math.floor(productionPerSecond * elapsedHours * 3600 * offlineEfficiency);

  return {
    essenceEarned,
    hoursAway: elapsedHours,
    productionRate: productionPerSecond,
    efficiency: offlineEfficiency
  };
}

/**
 * Process a click action
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @param {number} comboMultiplier - Current combo multiplier
 * @returns {Object} Click result
 */
function processClick(state, characters = [], comboMultiplier = 1) {
  const clickPower = calculateClickPower(state, characters);
  const critChance = calculateCritChance(state);
  const critMultiplier = calculateCritMultiplier(state);

  const isCrit = Math.random() < critChance;
  const isGolden = Math.random() < GAME_CONFIG.goldenEssenceChance;

  let essenceGained = clickPower * comboMultiplier;

  if (isCrit) {
    essenceGained *= critMultiplier;
  }

  if (isGolden) {
    essenceGained *= GAME_CONFIG.goldenEssenceMultiplier;
  }

  essenceGained = Math.floor(essenceGained);

  return {
    essenceGained,
    isCrit,
    isGolden,
    clickPower,
    comboMultiplier
  };
}

/**
 * Purchase a generator
 * @param {Object} state - Current state
 * @param {string} generatorId - Generator to purchase
 * @param {number} count - Number to purchase (default 1)
 * @returns {Object} Updated state and result
 */
function purchaseGenerator(state, generatorId, count = 1) {
  const generator = GENERATORS.find(g => g.id === generatorId);
  if (!generator) {
    return { success: false, error: 'Invalid generator' };
  }

  // Check unlock requirement
  if (state.lifetimeEssence < generator.unlockEssence) {
    return { success: false, error: 'Generator not unlocked yet' };
  }

  const owned = state.generators[generatorId] || 0;
  const cost = getBulkGeneratorCost(generatorId, owned, count);

  if (state.essence < cost) {
    return { success: false, error: 'Not enough essence' };
  }

  // Apply purchase
  const newState = { ...state };
  newState.essence -= cost;
  newState.generators = { ...state.generators };
  newState.generators[generatorId] = owned + count;

  // Update stats
  newState.stats = { ...state.stats };
  newState.stats.totalGeneratorsBought = (state.stats.totalGeneratorsBought || 0) + count;

  // Update daily
  newState.daily = { ...state.daily };
  newState.daily.generatorsBought = (state.daily.generatorsBought || 0) + count;

  return {
    success: true,
    newState,
    cost,
    generator,
    newCount: owned + count
  };
}

/**
 * Purchase an upgrade
 * @param {Object} state - Current state
 * @param {string} upgradeId - Upgrade to purchase
 * @returns {Object} Updated state and result
 */
function purchaseUpgrade(state, upgradeId) {
  // Check if already purchased
  if (state.purchasedUpgrades.includes(upgradeId)) {
    return { success: false, error: 'Upgrade already purchased' };
  }

  // Find upgrade in all upgrade arrays
  const allUpgrades = [...CLICK_UPGRADES, ...GENERATOR_UPGRADES, ...GLOBAL_UPGRADES, ...SYNERGY_UPGRADES];
  const upgrade = allUpgrades.find(u => u.id === upgradeId);

  if (!upgrade) {
    return { success: false, error: 'Invalid upgrade' };
  }

  // Check unlock requirement
  if (upgrade.unlockEssence && state.lifetimeEssence < upgrade.unlockEssence) {
    return { success: false, error: 'Upgrade not unlocked yet' };
  }

  // Check generator requirement for generator upgrades
  if (upgrade.requiredOwned) {
    const owned = state.generators[upgrade.generatorId] || 0;
    if (owned < upgrade.requiredOwned) {
      return { success: false, error: `Need ${upgrade.requiredOwned} ${upgrade.generatorId}` };
    }
  }

  if (state.essence < upgrade.cost) {
    return { success: false, error: 'Not enough essence' };
  }

  // Apply purchase
  const newState = { ...state };
  newState.essence -= upgrade.cost;
  newState.purchasedUpgrades = [...state.purchasedUpgrades, upgradeId];

  // Update stats
  newState.stats = { ...state.stats };
  newState.stats.totalUpgradesPurchased = (state.stats.totalUpgradesPurchased || 0) + 1;

  return {
    success: true,
    newState,
    upgrade
  };
}

/**
 * Calculate prestige shards earned
 * @param {number} lifetimeEssence - Lifetime essence
 * @returns {number} Shards earned
 */
function calculatePrestigeShards(lifetimeEssence) {
  if (lifetimeEssence < PRESTIGE_CONFIG.minimumEssence) {
    return 0;
  }
  return Math.floor(Math.sqrt(lifetimeEssence / PRESTIGE_CONFIG.shardDivisor));
}

/**
 * Perform prestige (awakening)
 * @param {Object} state - Current state
 * @param {Object} user - User object for rewards
 * @returns {Object} Prestige result
 */
function performPrestige(state, user) {
  if (state.lifetimeEssence < PRESTIGE_CONFIG.minimumEssence) {
    return { success: false, error: 'Not enough lifetime essence to prestige' };
  }

  const shardsEarned = calculatePrestigeShards(state.lifetimeEssence);
  if (shardsEarned <= 0) {
    return { success: false, error: 'Would not earn any shards' };
  }

  // Calculate starting essence from prestige upgrade
  let startingEssence = 0;
  const prestigeStarting = state.prestigeUpgrades?.prestige_starting || 0;
  const startingUpgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === 'prestige_starting');
  if (startingUpgrade) {
    startingEssence = prestigeStarting * startingUpgrade.bonusPerLevel;
  }

  // Create new state (reset with bonuses kept)
  const newState = {
    ...getInitialState(),
    essence: startingEssence,
    prestigeLevel: (state.prestigeLevel || 0) + 1,
    prestigeShards: (state.prestigeShards || 0) + shardsEarned,
    lifetimeShards: (state.lifetimeShards || 0) + shardsEarned,
    prestigeUpgrades: { ...state.prestigeUpgrades },
    assignedCharacters: state.assignedCharacters,
    claimedMilestones: state.claimedMilestones,
    stats: {
      ...state.stats,
      totalPrestigeCount: (state.stats?.totalPrestigeCount || 0) + 1
    },
    lastOnlineTimestamp: Date.now(),
    createdAt: state.createdAt
  };

  // Calculate Fate Points reward
  let fatePointsReward = 0;
  if (newState.prestigeLevel === 1) {
    fatePointsReward = PRESTIGE_FATE_REWARDS.firstPrestige;
  } else if (newState.prestigeLevel <= PRESTIGE_FATE_REWARDS.maxPrestigeRewards) {
    fatePointsReward = PRESTIGE_FATE_REWARDS.perPrestige;
  }

  // Calculate XP reward
  const xpReward = XP_REWARDS.perPrestige;

  return {
    success: true,
    newState,
    shardsEarned,
    totalShards: newState.prestigeShards,
    prestigeLevel: newState.prestigeLevel,
    fatePointsReward,
    xpReward,
    startingEssence
  };
}

/**
 * Purchase a prestige upgrade
 * @param {Object} state - Current state
 * @param {string} upgradeId - Prestige upgrade ID
 * @returns {Object} Result
 */
function purchasePrestigeUpgrade(state, upgradeId) {
  const upgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) {
    return { success: false, error: 'Invalid prestige upgrade' };
  }

  const currentLevel = state.prestigeUpgrades?.[upgradeId] || 0;
  if (currentLevel >= upgrade.maxLevel) {
    return { success: false, error: 'Upgrade is at max level' };
  }

  const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));

  if ((state.prestigeShards || 0) < cost) {
    return { success: false, error: 'Not enough awakening shards' };
  }

  const newState = { ...state };
  newState.prestigeShards = (state.prestigeShards || 0) - cost;
  newState.prestigeUpgrades = {
    ...state.prestigeUpgrades,
    [upgradeId]: currentLevel + 1
  };

  return {
    success: true,
    newState,
    upgrade,
    newLevel: currentLevel + 1,
    cost
  };
}

/**
 * Check and claim Fate Points milestones
 * @param {Object} state - Current state
 * @returns {Object} Milestones to claim
 */
function checkMilestones(state) {
  const claimable = [];

  for (const milestone of FATE_POINT_MILESTONES) {
    const milestoneKey = `fp_${milestone.lifetimeEssence}`;
    if (state.lifetimeEssence >= milestone.lifetimeEssence &&
        !state.claimedMilestones?.includes(milestoneKey)) {
      claimable.push({
        ...milestone,
        key: milestoneKey
      });
    }
  }

  return claimable;
}

/**
 * Claim a milestone
 * @param {Object} state - Current state
 * @param {string} milestoneKey - Milestone key
 * @returns {Object} Result
 */
function claimMilestone(state, milestoneKey) {
  if (state.claimedMilestones?.includes(milestoneKey)) {
    return { success: false, error: 'Milestone already claimed' };
  }

  const milestone = FATE_POINT_MILESTONES.find(m => `fp_${m.lifetimeEssence}` === milestoneKey);
  if (!milestone) {
    return { success: false, error: 'Invalid milestone' };
  }

  if (state.lifetimeEssence < milestone.lifetimeEssence) {
    return { success: false, error: 'Milestone not reached' };
  }

  const newState = { ...state };
  newState.claimedMilestones = [...(state.claimedMilestones || []), milestoneKey];

  return {
    success: true,
    newState,
    fatePoints: milestone.fatePoints
  };
}

/**
 * Assign a character for production bonus
 * @param {Object} state - Current state
 * @param {string} characterId - Character ID to assign
 * @param {Array} ownedCharacters - User's owned characters
 * @returns {Object} Result
 */
function assignCharacter(state, characterId, ownedCharacters) {
  // Check if character is owned
  const isOwned = ownedCharacters.some(c => c.id === characterId || c.characterId === characterId);
  if (!isOwned) {
    return { success: false, error: 'Character not owned' };
  }

  // Check if already assigned
  if (state.assignedCharacters?.includes(characterId)) {
    return { success: false, error: 'Character already assigned' };
  }

  // Check limit
  if ((state.assignedCharacters?.length || 0) >= GAME_CONFIG.maxAssignedCharacters) {
    return { success: false, error: 'Maximum characters assigned' };
  }

  const newState = { ...state };
  newState.assignedCharacters = [...(state.assignedCharacters || []), characterId];

  return {
    success: true,
    newState
  };
}

/**
 * Unassign a character
 * @param {Object} state - Current state
 * @param {string} characterId - Character ID to unassign
 * @returns {Object} Result
 */
function unassignCharacter(state, characterId) {
  if (!state.assignedCharacters?.includes(characterId)) {
    return { success: false, error: 'Character not assigned' };
  }

  const newState = { ...state };
  newState.assignedCharacters = state.assignedCharacters.filter(id => id !== characterId);

  return {
    success: true,
    newState
  };
}

/**
 * Reset daily progress (called at start of new day)
 * @param {Object} state - Current state
 * @returns {Object} New state with reset daily
 */
function resetDaily(state) {
  const today = new Date().toISOString().split('T')[0];

  if (state.daily?.date === today) {
    return state; // Already reset for today
  }

  return {
    ...state,
    daily: {
      date: today,
      clicks: 0,
      crits: 0,
      essenceEarned: 0,
      generatorsBought: 0,
      completedChallenges: []
    }
  };
}

/**
 * Check daily challenges progress
 * @param {Object} state - Current state
 * @returns {Array} Completed challenges
 */
function checkDailyChallenges(state) {
  const completedNew = [];

  for (const challenge of DAILY_CHALLENGES) {
    if (state.daily?.completedChallenges?.includes(challenge.id)) {
      continue; // Already completed
    }

    let progress = 0;
    let target = challenge.target;

    switch (challenge.type) {
      case 'clicks':
        progress = state.daily?.clicks || 0;
        break;
      case 'crits':
        progress = state.daily?.crits || 0;
        break;
      case 'essence_earned':
        progress = state.daily?.essenceEarned || 0;
        break;
      case 'generators_bought':
        progress = state.daily?.generatorsBought || 0;
        break;
    }

    if (progress >= target) {
      completedNew.push(challenge);
    }
  }

  return completedNew;
}

/**
 * Get available generators for the UI
 * @param {Object} state - Current state
 * @returns {Array} Available generators with costs
 */
function getAvailableGenerators(state) {
  return GENERATORS.map(gen => {
    const owned = state.generators?.[gen.id] || 0;
    const cost = getGeneratorCost(gen.id, owned);
    const unlocked = state.lifetimeEssence >= gen.unlockEssence;

    return {
      ...gen,
      owned,
      cost,
      unlocked,
      canAfford: state.essence >= cost,
      maxPurchasable: getMaxPurchasable(gen.id, owned, state.essence)
    };
  });
}

/**
 * Get available upgrades for the UI
 * @param {Object} state - Current state
 * @returns {Object} Categorized upgrades
 */
function getAvailableUpgrades(state) {
  const formatUpgrade = (upgrade) => ({
    ...upgrade,
    purchased: state.purchasedUpgrades?.includes(upgrade.id),
    canAfford: state.essence >= upgrade.cost,
    unlocked: !upgrade.unlockEssence || state.lifetimeEssence >= upgrade.unlockEssence,
    meetsRequirements: !upgrade.requiredOwned || (state.generators?.[upgrade.generatorId] || 0) >= upgrade.requiredOwned
  });

  return {
    click: CLICK_UPGRADES.map(formatUpgrade),
    generator: GENERATOR_UPGRADES.map(formatUpgrade),
    global: GLOBAL_UPGRADES.map(formatUpgrade),
    synergy: SYNERGY_UPGRADES.map(formatUpgrade)
  };
}

/**
 * Get prestige info for the UI
 * @param {Object} state - Current state
 * @returns {Object} Prestige information
 */
function getPrestigeInfo(state) {
  const shardsIfPrestige = calculatePrestigeShards(state.lifetimeEssence);
  const currentShards = state.prestigeShards || 0;
  const currentPrestigeBonus = 1 + Math.min(state.lifetimeShards || 0, PRESTIGE_CONFIG.maxEffectiveShards) * PRESTIGE_CONFIG.shardMultiplier;
  const bonusAfterPrestige = 1 + Math.min((state.lifetimeShards || 0) + shardsIfPrestige, PRESTIGE_CONFIG.maxEffectiveShards) * PRESTIGE_CONFIG.shardMultiplier;

  const upgrades = PRESTIGE_CONFIG.upgrades.map(upgrade => {
    const level = state.prestigeUpgrades?.[upgrade.id] || 0;
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
    const canAfford = currentShards >= cost;
    const maxed = level >= upgrade.maxLevel;

    return {
      ...upgrade,
      level,
      cost,
      canAfford,
      maxed
    };
  });

  return {
    canPrestige: state.lifetimeEssence >= PRESTIGE_CONFIG.minimumEssence,
    minimumEssence: PRESTIGE_CONFIG.minimumEssence,
    shardsIfPrestige,
    currentShards,
    lifetimeShards: state.lifetimeShards || 0,
    prestigeLevel: state.prestigeLevel || 0,
    currentBonus: currentPrestigeBonus,
    bonusAfterPrestige,
    upgrades
  };
}

/**
 * Get full game state for the UI
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @returns {Object} Full game state for UI
 */
function getGameState(state, characters = []) {
  const clickPower = calculateClickPower(state, characters);
  const productionPerSecond = calculateProductionPerSecond(state, characters);
  const critChance = calculateCritChance(state);
  const critMultiplier = calculateCritMultiplier(state);

  return {
    essence: state.essence || 0,
    lifetimeEssence: state.lifetimeEssence || 0,
    clickPower,
    productionPerSecond,
    critChance,
    critMultiplier,
    generators: getAvailableGenerators(state),
    upgrades: getAvailableUpgrades(state),
    prestige: getPrestigeInfo(state),
    assignedCharacters: state.assignedCharacters || [],
    maxAssignedCharacters: GAME_CONFIG.maxAssignedCharacters,
    characterBonus: calculateCharacterBonus(state, characters),
    stats: state.stats || {},
    daily: state.daily || {},
    claimableMilestones: checkMilestones(state),
    lastOnlineTimestamp: state.lastOnlineTimestamp
  };
}

module.exports = {
  getInitialState,
  getGeneratorCost,
  getBulkGeneratorCost,
  getMaxPurchasable,
  calculateClickPower,
  calculateCritChance,
  calculateCritMultiplier,
  calculateProductionPerSecond,
  calculateGlobalMultiplier,
  calculateCharacterBonus,
  calculateOfflineProgress,
  processClick,
  purchaseGenerator,
  purchaseUpgrade,
  calculatePrestigeShards,
  performPrestige,
  purchasePrestigeUpgrade,
  checkMilestones,
  claimMilestone,
  assignCharacter,
  unassignCharacter,
  resetDaily,
  checkDailyChallenges,
  getAvailableGenerators,
  getAvailableUpgrades,
  getPrestigeInfo,
  getGameState,
  GENERATORS,
  GAME_CONFIG
};
