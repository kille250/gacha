/**
 * Ability Action
 *
 * Unified ability handling for REST and WebSocket.
 * Delegates to ability.service.js for business logic.
 */

const abilityService = require('../domains/ability.service');

/**
 * Ability action result
 * @typedef {Object} AbilityResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [newState] - Updated state
 * @property {Object} [ability] - Ability data
 * @property {number} [duration] - Ability duration in ms
 * @property {Object} [effects] - Ability effects
 * @property {number} [bonusEssence] - Bonus essence if applicable
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Activate an ability
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string} params.abilityId - Ability ID to activate
 * @returns {AbilityResult} Activation result
 */
function activateAbility({ state, abilityId }) {
  if (!abilityId) {
    return {
      success: false,
      error: 'Ability ID required',
      code: 'INVALID_REQUEST'
    };
  }

  const result = abilityService.activateAbility(state, abilityId);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  result.newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState: result.newState,
    ability: result.ability,
    duration: result.duration,
    effects: result.effects,
    bonusEssence: result.bonusEssence,
    essence: result.newState.essence,
    activeAbilities: getActiveAbilityStatus(result.newState)
  };
}

/**
 * Get ability information for UI
 * @param {Object} state - Current state
 * @returns {Object} Abilities info
 */
function getAbilityInfo(state) {
  return abilityService.getAbilityInfo(state);
}

/**
 * Get currently active ability effects
 * @param {Object} state - Current state
 * @returns {Object} Active effects
 */
function getActiveAbilityEffects(state) {
  return abilityService.getActiveAbilityEffects(state);
}

/**
 * Check if an ability is on cooldown
 * @param {Object} state - Current state
 * @param {string} abilityId - Ability ID
 * @returns {boolean} True if on cooldown
 */
function isAbilityOnCooldown(state, abilityId) {
  return abilityService.isAbilityOnCooldown(state, abilityId);
}

/**
 * Get active ability status for response
 * @param {Object} state - Current state
 * @returns {Object} Active abilities with remaining time
 */
function getActiveAbilityStatus(state) {
  const info = abilityService.getAbilityInfo(state);
  const active = {};

  for (const [id, ability] of Object.entries(info)) {
    if (ability.isActive) {
      active[id] = {
        remainingMs: ability.activeRemaining,
        effects: ability.effects
      };
    }
  }

  return active;
}

/**
 * Map error message to error code
 * @param {string} error - Error message
 * @returns {string} Error code
 */
function mapErrorToCode(error) {
  if (error.includes('Invalid ability')) return 'INVALID_ABILITY';
  if (error.includes('Requires Prestige')) return 'ABILITY_LOCKED';
  if (error.includes('cooldown')) return 'ABILITY_COOLDOWN';
  return 'ABILITY_ACTIVATION_FAILED';
}

module.exports = {
  activateAbility,
  getAbilityInfo,
  getActiveAbilityEffects,
  isAbilityOnCooldown
};
