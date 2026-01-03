/**
 * Ability Service
 *
 * Handles active ability mechanics for Essence Tap.
 * Includes activation, cooldown management, and effect calculation.
 */

const { ACTIVE_ABILITIES, GAME_CONFIG } = require('../../../config/essenceTap');
const { calculateProductionPerSecond } = require('../calculations/production');

/**
 * Get active abilities info for UI
 * @param {Object} state - Current state
 * @returns {Object} Active abilities info keyed by ability ID
 */
function getAbilityInfo(state) {
  const now = Date.now();
  const abilities = {};

  for (const ability of ACTIVE_ABILITIES) {
    const lastUsed = state.abilityCooldowns?.[ability.id] || 0;
    const cooldownRemaining = Math.max(0, ability.cooldown - (now - lastUsed));
    const isActive = lastUsed > 0 && (now - lastUsed) < ability.duration;
    const activeRemaining = isActive ? ability.duration - (now - lastUsed) : 0;

    abilities[ability.id] = {
      ...ability,
      available: cooldownRemaining === 0 && state.prestigeLevel >= ability.unlockPrestige,
      cooldownRemaining,
      isActive,
      activeRemaining,
      unlocked: state.prestigeLevel >= ability.unlockPrestige
    };
  }

  return abilities;
}

/**
 * Check if an ability is on cooldown
 * @param {Object} state - Current state
 * @param {string} abilityId - Ability ID to check
 * @returns {boolean} True if on cooldown
 */
function isAbilityOnCooldown(state, abilityId) {
  const ability = ACTIVE_ABILITIES.find(a => a.id === abilityId);
  if (!ability) {
    return true; // Invalid ability is always on "cooldown"
  }

  const now = Date.now();
  const lastUsed = state.abilityCooldowns?.[abilityId] || 0;
  const cooldownRemaining = Math.max(0, ability.cooldown - (now - lastUsed));

  return cooldownRemaining > 0;
}

/**
 * Get current active ability effects
 * @param {Object} state - Current state
 * @returns {Object} Current active effects
 */
function getActiveAbilityEffects(state) {
  const now = Date.now();
  const effects = {
    productionMultiplier: 1,
    guaranteedCrits: false,
    goldenChanceMultiplier: 1
  };

  for (const ability of ACTIVE_ABILITIES) {
    const lastUsed = state.abilityCooldowns?.[ability.id] || 0;
    const isActive = lastUsed > 0 && (now - lastUsed) < ability.duration;

    if (isActive && ability.effects) {
      if (ability.effects.productionMultiplier) {
        effects.productionMultiplier *= ability.effects.productionMultiplier;
      }
      if (ability.effects.guaranteedCrits) {
        effects.guaranteedCrits = true;
      }
      if (ability.effects.goldenChanceMultiplier) {
        effects.goldenChanceMultiplier *= ability.effects.goldenChanceMultiplier;
      }
    }
  }

  return effects;
}

/**
 * Process active abilities (update state based on active effects)
 * This is called during tap processing to apply active effects
 * @param {Object} state - Current state
 * @returns {Object} State with processed ability effects
 */
function processActiveAbilities(state) {
  // This function primarily exists for API compatibility
  // Active abilities are processed by getActiveAbilityEffects
  // which is called during tap/production calculations

  // We could clean up expired abilities here if needed
  const now = Date.now();
  const newState = { ...state };

  // Remove cooldown entries that have fully expired (optional cleanup)
  if (state.abilityCooldowns) {
    const cleanedCooldowns = {};
    for (const [abilityId, lastUsed] of Object.entries(state.abilityCooldowns)) {
      const ability = ACTIVE_ABILITIES.find(a => a.id === abilityId);
      if (ability) {
        // Keep cooldown if still within cooldown period or active duration
        const maxTime = Math.max(ability.cooldown, ability.duration);
        if (now - lastUsed < maxTime) {
          cleanedCooldowns[abilityId] = lastUsed;
        }
      }
    }
    newState.abilityCooldowns = cleanedCooldowns;
  }

  return newState;
}

/**
 * Activate an ability
 * @param {Object} state - Current state
 * @param {string} abilityId - ID of ability to activate
 * @returns {Object} Result { success, newState?, error?, ability?, duration?, effects?, bonusEssence? }
 */
function activateAbility(state, abilityId) {
  const ability = ACTIVE_ABILITIES.find(a => a.id === abilityId);
  if (!ability) {
    return { success: false, error: 'Invalid ability' };
  }

  // Check prestige unlock requirement
  if ((state.prestigeLevel || 0) < ability.unlockPrestige) {
    return { success: false, error: `Requires Prestige ${ability.unlockPrestige}` };
  }

  // Check cooldown
  const now = Date.now();
  const lastUsed = state.abilityCooldowns?.[abilityId] || 0;
  if (now - lastUsed < ability.cooldown) {
    const remaining = Math.ceil((ability.cooldown - (now - lastUsed)) / 1000);
    return { success: false, error: `On cooldown. ${remaining}s remaining.` };
  }

  const newState = { ...state };
  newState.abilityCooldowns = {
    ...state.abilityCooldowns,
    [abilityId]: now
  };

  // For time_warp, also add offline essence
  let bonusEssence = 0;
  if (ability.id === 'time_warp' && ability.effects?.offlineMinutes) {
    const offlineMinutes = ability.effects.offlineMinutes;
    const productionPerSecond = calculateProductionPerSecond(state, []);
    bonusEssence = Math.floor(productionPerSecond * offlineMinutes * 60 * GAME_CONFIG.offlineEfficiency);
    newState.essence = (state.essence || 0) + bonusEssence;
    newState.lifetimeEssence = (state.lifetimeEssence || 0) + bonusEssence;
  }

  return {
    success: true,
    ability,
    duration: ability.duration,
    effects: ability.effects,
    bonusEssence,
    newState
  };
}

module.exports = {
  activateAbility,
  processActiveAbilities,
  getAbilityInfo,
  getActiveAbilityEffects,
  isAbilityOnCooldown
};
