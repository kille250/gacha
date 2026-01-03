/**
 * Validation utilities for Essence Tap
 */

const { ValidationError, InsufficientResourcesError } = require('./errors');

/**
 * Validate that a value is a positive integer
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {number} Validated integer
 */
function validatePositiveInt(value, fieldName) {
  const num = Math.floor(Number(value));
  if (!Number.isFinite(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`, fieldName);
  }
  return num;
}

/**
 * Validate that a value is a non-negative integer
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {number} Validated integer
 */
function validateNonNegativeInt(value, fieldName) {
  const num = Math.floor(Number(value));
  if (!Number.isFinite(num) || num < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative integer`, fieldName);
  }
  return num;
}

/**
 * Validate that a string is non-empty
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {string} Validated string
 */
function validateNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} must be a non-empty string`, fieldName);
  }
  return value.trim();
}

/**
 * Validate that a value is one of allowed values
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} fieldName - Field name for error messages
 * @returns {*} Validated value
 */
function validateEnum(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName
    );
  }
  return value;
}

/**
 * Validate that user has sufficient essence
 * @param {Object} state - Clicker state
 * @param {number} required - Required essence amount
 */
function validateEssence(state, required) {
  const available = state.essence || 0;
  if (available < required) {
    throw new InsufficientResourcesError('essence', required, available);
  }
}

/**
 * Validate that user has sufficient shards
 * @param {Object} state - Clicker state
 * @param {number} required - Required shard amount
 */
function validateShards(state, required) {
  const available = state.prestigeShards || 0;
  if (available < required) {
    throw new InsufficientResourcesError('shards', required, available);
  }
}

/**
 * Validate generator purchase request
 * @param {string} generatorId - Generator ID
 * @param {number} count - Purchase count
 * @param {Array} generators - Available generators
 * @returns {Object} { generator, count }
 */
function validateGeneratorPurchase(generatorId, count, generators) {
  const validatedCount = validatePositiveInt(count, 'count');
  const generator = generators.find(g => g.id === generatorId);

  if (!generator) {
    throw new ValidationError(`Invalid generator: ${generatorId}`, 'generatorId');
  }

  return { generator, count: validatedCount };
}

/**
 * Validate upgrade purchase request
 * @param {string} upgradeId - Upgrade ID
 * @param {Object} allUpgrades - All available upgrades by category
 * @returns {Object} Found upgrade
 */
function validateUpgradePurchase(upgradeId, allUpgrades) {
  for (const category of Object.values(allUpgrades)) {
    const upgrade = category.find(u => u.id === upgradeId);
    if (upgrade) {
      return upgrade;
    }
  }
  throw new ValidationError(`Invalid upgrade: ${upgradeId}`, 'upgradeId');
}

/**
 * Validate character assignment
 * @param {number} characterId - Character ID to assign
 * @param {Array} userCharacters - User's character collection
 * @returns {Object} Found character
 */
function validateCharacterAssignment(characterId, userCharacters) {
  const character = userCharacters.find(
    c => c.id === characterId || c.characterId === characterId
  );

  if (!character) {
    throw new ValidationError('Character not found in collection', 'characterId');
  }

  return character;
}

/**
 * Validate bet amount for gambling
 * @param {number} betAmount - Bet amount
 * @param {number} currentEssence - Current essence
 * @param {Object} config - Gambling config with minBet, maxBetPercent
 * @returns {number} Validated bet amount
 */
function validateBetAmount(betAmount, currentEssence, config) {
  const amount = validatePositiveInt(betAmount, 'betAmount');

  if (amount < config.minBet) {
    throw new ValidationError(`Minimum bet is ${config.minBet} essence`, 'betAmount');
  }

  const maxBet = Math.floor(currentEssence * config.maxBetPercent);
  if (amount > maxBet) {
    throw new ValidationError(
      `Maximum bet is ${maxBet} essence (${config.maxBetPercent * 100}% of current essence)`,
      'betAmount'
    );
  }

  if (amount > currentEssence) {
    throw new InsufficientResourcesError('essence', amount, currentEssence);
  }

  return amount;
}

module.exports = {
  validatePositiveInt,
  validateNonNegativeInt,
  validateNonEmptyString,
  validateEnum,
  validateEssence,
  validateShards,
  validateGeneratorPurchase,
  validateUpgradePurchase,
  validateCharacterAssignment,
  validateBetAmount
};
