/**
 * Essence Tap Input Validation
 *
 * Provides validation functions for action inputs.
 * Centralizes validation logic to ensure consistency across
 * REST routes and WebSocket handlers.
 */

const config = require('../../config/essenceTap');

// ===========================================
// VALIDATION HELPERS
// ===========================================

/**
 * Create a validation result
 * @param {boolean} valid - Whether validation passed
 * @param {string} [error] - Error message if invalid
 * @param {string} [code] - Error code if invalid
 * @returns {{valid: boolean, error?: string, code?: string}}
 */
function result(valid, error, code) {
  if (valid) return { valid: true };
  return { valid: false, error, code };
}

/**
 * Check if a value is a positive integer
 * @param {*} value - Value to check
 * @returns {boolean}
 */
function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Check if a value is a non-negative number
 * @param {*} value - Value to check
 * @returns {boolean}
 */
function isNonNegativeNumber(value) {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

// ===========================================
// GENERATOR VALIDATION
// ===========================================

/**
 * Validate generator purchase input
 * @param {Object} input
 * @param {string} input.generatorId - Generator to purchase
 * @param {number|string} input.count - Count to purchase
 * @returns {{valid: boolean, error?: string, code?: string, parsed?: Object}}
 */
function validateGeneratorPurchase({ generatorId, count = 1 }) {
  if (!generatorId) {
    return result(false, 'Generator ID required', 'MISSING_GENERATOR_ID');
  }

  // Check if generator exists
  const generatorConfig = config.GENERATORS?.find(g => g.id === generatorId);
  if (!generatorConfig) {
    return result(false, 'Invalid generator ID', 'INVALID_GENERATOR_ID');
  }

  // Parse and validate count
  let parsedCount;
  if (count === 'max') {
    parsedCount = 'max';
  } else {
    parsedCount = parseInt(count, 10);
    if (isNaN(parsedCount) || parsedCount < 1) {
      return result(false, 'Invalid count', 'INVALID_COUNT');
    }
    if (parsedCount > 1000) {
      return result(false, 'Count too large', 'COUNT_TOO_LARGE');
    }
  }

  return {
    valid: true,
    parsed: { generatorId, count: parsedCount }
  };
}

// ===========================================
// UPGRADE VALIDATION
// ===========================================

/**
 * Validate upgrade purchase input
 * @param {Object} input
 * @param {string} input.upgradeId - Upgrade to purchase
 * @returns {{valid: boolean, error?: string, code?: string}}
 */
function validateUpgradePurchase({ upgradeId }) {
  if (!upgradeId) {
    return result(false, 'Upgrade ID required', 'MISSING_UPGRADE_ID');
  }

  // Check if upgrade exists in any category
  const allUpgrades = [
    ...(config.CLICK_UPGRADES || []),
    ...(config.GENERATOR_UPGRADES || []),
    ...(config.GLOBAL_UPGRADES || []),
    ...(config.SYNERGY_UPGRADES || [])
  ];

  const upgradeConfig = allUpgrades.find(u => u.id === upgradeId);
  if (!upgradeConfig) {
    return result(false, 'Invalid upgrade ID', 'INVALID_UPGRADE_ID');
  }

  return { valid: true };
}

/**
 * Validate prestige upgrade purchase input
 * @param {Object} input
 * @param {string} input.upgradeId - Prestige upgrade to purchase
 * @returns {{valid: boolean, error?: string, code?: string}}
 */
function validatePrestigeUpgradePurchase({ upgradeId }) {
  if (!upgradeId) {
    return result(false, 'Upgrade ID required', 'MISSING_UPGRADE_ID');
  }

  const prestigeConfig = config.PRESTIGE_CONFIG?.upgrades;
  if (!prestigeConfig || !prestigeConfig[upgradeId]) {
    return result(false, 'Invalid prestige upgrade ID', 'INVALID_UPGRADE_ID');
  }

  return { valid: true };
}

// ===========================================
// GAMBLE VALIDATION
// ===========================================

/**
 * Validate gamble input
 * @param {Object} input
 * @param {number} input.betAmount - Amount to bet
 * @param {string} input.betType - Type of bet
 * @param {number} input.currentEssence - Current essence (for validation)
 * @returns {{valid: boolean, error?: string, code?: string, parsed?: Object}}
 */
function validateGamble({ betAmount, betType, currentEssence }) {
  // Validate bet amount
  const parsedAmount = parseInt(betAmount, 10);
  if (isNaN(parsedAmount) || parsedAmount < 1) {
    return result(false, 'Invalid bet amount', 'INVALID_BET_AMOUNT');
  }

  // Check minimum bet
  const minBet = config.GAMBLE_CONFIG?.minBet || 100;
  if (parsedAmount < minBet) {
    return result(false, `Minimum bet is ${minBet}`, 'BET_TOO_SMALL');
  }

  // Check if user has enough essence (if provided)
  if (currentEssence !== undefined && parsedAmount > currentEssence) {
    return result(false, 'Insufficient essence', 'INSUFFICIENT_ESSENCE');
  }

  // Validate bet type
  const validBetTypes = config.GAMBLE_CONFIG?.betTypes || ['safe', 'balanced', 'risky', 'extreme'];
  if (!betType || !validBetTypes.includes(betType)) {
    return result(false, 'Invalid bet type', 'INVALID_BET_TYPE');
  }

  return {
    valid: true,
    parsed: { betAmount: parsedAmount, betType }
  };
}

// ===========================================
// CHARACTER VALIDATION
// ===========================================

/**
 * Validate character assignment input
 * @param {Object} input
 * @param {number} input.characterId - Character ID to assign
 * @param {Array} input.ownedCharacters - User's owned characters
 * @returns {{valid: boolean, error?: string, code?: string}}
 */
function validateCharacterAssign({ characterId, ownedCharacters = [] }) {
  if (!characterId) {
    return result(false, 'Character ID required', 'MISSING_CHARACTER_ID');
  }

  const parsedId = parseInt(characterId, 10);
  if (isNaN(parsedId)) {
    return result(false, 'Invalid character ID', 'INVALID_CHARACTER_ID');
  }

  // Check if user owns the character
  const owned = ownedCharacters.find(c =>
    c.id === parsedId || c.characterId === parsedId
  );
  if (!owned) {
    return result(false, 'Character not owned', 'CHARACTER_NOT_OWNED');
  }

  return { valid: true };
}

/**
 * Validate character swap input
 * @param {Object} input
 * @param {number} input.oldCharacterId - Character to remove
 * @param {number} input.newCharacterId - Character to add
 * @param {Array} input.ownedCharacters - User's owned characters
 * @param {Array} input.assignedCharacters - Currently assigned characters
 * @returns {{valid: boolean, error?: string, code?: string}}
 */
function validateCharacterSwap({ oldCharacterId, newCharacterId, ownedCharacters = [], assignedCharacters = [] }) {
  if (!oldCharacterId) {
    return result(false, 'Old character ID required', 'MISSING_OLD_CHARACTER_ID');
  }
  if (!newCharacterId) {
    return result(false, 'New character ID required', 'MISSING_NEW_CHARACTER_ID');
  }

  const oldId = parseInt(oldCharacterId, 10);
  const newId = parseInt(newCharacterId, 10);

  if (isNaN(oldId) || isNaN(newId)) {
    return result(false, 'Invalid character ID', 'INVALID_CHARACTER_ID');
  }

  // Check old character is assigned
  if (!assignedCharacters.includes(oldId)) {
    return result(false, 'Character not assigned', 'CHARACTER_NOT_ASSIGNED');
  }

  // Check new character is owned
  const owned = ownedCharacters.find(c =>
    c.id === newId || c.characterId === newId
  );
  if (!owned) {
    return result(false, 'Character not owned', 'CHARACTER_NOT_OWNED');
  }

  // Check new character isn't already assigned
  if (assignedCharacters.includes(newId)) {
    return result(false, 'Character already assigned', 'CHARACTER_ALREADY_ASSIGNED');
  }

  return { valid: true };
}

// ===========================================
// BOSS VALIDATION
// ===========================================

/**
 * Validate boss attack input
 * @param {Object} input
 * @param {number} input.damage - Damage to deal
 * @returns {{valid: boolean, error?: string, code?: string, parsed?: Object}}
 */
function validateBossAttack({ damage }) {
  if (damage === undefined || damage === null) {
    return result(false, 'Damage value required', 'MISSING_DAMAGE');
  }

  const parsedDamage = parseInt(damage, 10);
  if (isNaN(parsedDamage) || parsedDamage < 0) {
    return result(false, 'Invalid damage value', 'INVALID_DAMAGE');
  }

  // Cap damage to prevent exploits
  const maxDamage = 1000000000; // 1 billion
  if (parsedDamage > maxDamage) {
    return result(false, 'Damage value too large', 'DAMAGE_TOO_LARGE');
  }

  return {
    valid: true,
    parsed: { damage: parsedDamage }
  };
}

// ===========================================
// MILESTONE VALIDATION
// ===========================================

/**
 * Validate milestone claim input
 * @param {Object} input
 * @param {string} input.milestoneKey - Milestone to claim
 * @returns {{valid: boolean, error?: string, code?: string}}
 */
function validateMilestoneClaim({ milestoneKey }) {
  if (!milestoneKey) {
    return result(false, 'Milestone key required', 'MISSING_MILESTONE_KEY');
  }

  // Check if milestone exists
  const milestones = config.FATE_POINT_MILESTONES || {};
  if (!milestones[milestoneKey]) {
    return result(false, 'Invalid milestone key', 'INVALID_MILESTONE_KEY');
  }

  return { valid: true };
}

/**
 * Validate repeatable milestone claim input
 * @param {Object} input
 * @param {string} input.milestoneType - Milestone type to claim
 * @returns {{valid: boolean, error?: string, code?: string}}
 */
function validateRepeatableMilestoneClaim({ milestoneType }) {
  if (!milestoneType) {
    return result(false, 'Milestone type required', 'MISSING_MILESTONE_TYPE');
  }

  // Check if milestone type exists
  const repeatables = config.REPEATABLE_MILESTONES || {};
  if (!repeatables[milestoneType]) {
    return result(false, 'Invalid milestone type', 'INVALID_MILESTONE_TYPE');
  }

  return { valid: true };
}

/**
 * Validate daily challenge claim input
 * @param {Object} input
 * @param {string} input.challengeId - Challenge to claim
 * @returns {{valid: boolean, error?: string, code?: string}}
 */
function validateDailyChallengeClaim({ challengeId }) {
  if (!challengeId) {
    return result(false, 'Challenge ID required', 'MISSING_CHALLENGE_ID');
  }

  return { valid: true };
}

// ===========================================
// TOURNAMENT VALIDATION
// ===========================================

/**
 * Validate tournament checkpoint claim input
 * @param {Object} input
 * @param {number} input.day - Checkpoint day (1-7)
 * @returns {{valid: boolean, error?: string, code?: string, parsed?: Object}}
 */
function validateTournamentCheckpointClaim({ day }) {
  if (day === undefined || day === null) {
    return result(false, 'Day required', 'MISSING_DAY');
  }

  const parsedDay = parseInt(day, 10);
  if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 7) {
    return result(false, 'Invalid checkpoint day (1-7)', 'INVALID_DAY');
  }

  return {
    valid: true,
    parsed: { day: parsedDay }
  };
}

/**
 * Validate cosmetic equip input
 * @param {Object} input
 * @param {string} input.cosmeticId - Cosmetic to equip
 * @returns {{valid: boolean, error?: string, code?: string}}
 */
function validateCosmeticEquip({ cosmeticId }) {
  if (!cosmeticId) {
    return result(false, 'Cosmetic ID required', 'MISSING_COSMETIC_ID');
  }

  // Check if cosmetic exists
  const cosmetics = config.TOURNAMENT_COSMETICS?.items || {};
  if (!cosmetics[cosmeticId]) {
    return result(false, 'Invalid cosmetic ID', 'INVALID_COSMETIC_ID');
  }

  return { valid: true };
}

/**
 * Validate cosmetic unequip input
 * @param {Object} input
 * @param {string} input.slot - Slot to unequip
 * @returns {{valid: boolean, error?: string, code?: string}}
 */
function validateCosmeticUnequip({ slot }) {
  const validSlots = ['avatarFrame', 'profileTitle', 'tapSkin'];

  if (!slot) {
    return result(false, 'Slot required', 'MISSING_SLOT');
  }

  if (!validSlots.includes(slot)) {
    return result(false, `Invalid slot (${validSlots.join(', ')})`, 'INVALID_SLOT');
  }

  return { valid: true };
}

// ===========================================
// CLICK VALIDATION
// ===========================================

/**
 * Validate click/tap input
 * @param {Object} input
 * @param {number} input.count - Number of clicks
 * @param {number} input.comboMultiplier - Combo multiplier
 * @returns {{valid: boolean, error?: string, code?: string, parsed?: Object}}
 */
function validateClicks({ count = 1, comboMultiplier = 1 }) {
  const parsedCount = parseInt(count, 10);
  const maxClicks = config.GAME_CONFIG?.maxClicksPerSecond || 20;

  if (isNaN(parsedCount) || parsedCount < 1) {
    return result(false, 'Invalid click count', 'INVALID_COUNT');
  }

  if (parsedCount > maxClicks) {
    return result(false, 'Too many clicks', 'TOO_MANY_CLICKS');
  }

  const parsedCombo = parseFloat(comboMultiplier);
  if (isNaN(parsedCombo) || parsedCombo < 1) {
    return result(false, 'Invalid combo multiplier', 'INVALID_COMBO');
  }

  // Cap combo multiplier to prevent exploits
  const maxCombo = config.GAME_CONFIG?.maxComboMultiplier || 10;
  const cappedCombo = Math.min(parsedCombo, maxCombo);

  return {
    valid: true,
    parsed: { count: parsedCount, comboMultiplier: cappedCombo }
  };
}

// ===========================================
// ABILITY VALIDATION
// ===========================================

/**
 * Validate ability activation input
 * @param {Object} input
 * @param {string} input.abilityId - Ability to activate
 * @returns {{valid: boolean, error?: string, code?: string}}
 */
function validateAbilityActivation({ abilityId }) {
  if (!abilityId) {
    return result(false, 'Ability ID required', 'MISSING_ABILITY_ID');
  }

  // Check if ability exists
  const abilities = config.ACTIVE_ABILITIES || {};
  if (!abilities[abilityId]) {
    return result(false, 'Invalid ability ID', 'INVALID_ABILITY_ID');
  }

  return { valid: true };
}

module.exports = {
  // Helpers
  result,
  isPositiveInt,
  isNonNegativeNumber,

  // Validators
  validateGeneratorPurchase,
  validateUpgradePurchase,
  validatePrestigeUpgradePurchase,
  validateGamble,
  validateCharacterAssign,
  validateCharacterSwap,
  validateBossAttack,
  validateMilestoneClaim,
  validateRepeatableMilestoneClaim,
  validateDailyChallengeClaim,
  validateTournamentCheckpointClaim,
  validateCosmeticEquip,
  validateCosmeticUnequip,
  validateClicks,
  validateAbilityActivation
};
