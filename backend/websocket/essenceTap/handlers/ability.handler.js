/**
 * Ability Handlers - Active ability operations
 */

const { createHandler } = require('../createHandler');
const essenceTapService = require('../../../services/essenceTapService');

/**
 * Handle ability activation
 */
const handleActivateAbility = createHandler({
  eventName: 'ability_activated',
  errorCode: 'ABILITY_ERROR',
  validate: (data) => data.abilityId ? null : 'Ability ID required',
  execute: async (ctx, data) => {
    const { abilityId } = data;

    const result = essenceTapService.activateAbility(ctx.state, abilityId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        rejectData: {
          cooldownRemaining: result.cooldownRemaining
        }
      };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        abilityId,
        ability: result.ability,
        essence: result.newState.essence,
        activeAbilities: result.newState.abilities?.active || {}
      }
    };
  }
});

module.exports = {
  handleActivateAbility
};
