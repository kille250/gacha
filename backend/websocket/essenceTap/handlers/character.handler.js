/**
 * Character Handlers - Character assignment operations
 */

const { createHandler } = require('../createHandler');
const essenceTapService = require('../../../services/essenceTapService');

/**
 * Handle character assignment
 */
const handleAssignCharacter = createHandler({
  eventName: 'character_assigned',
  errorCode: 'CHARACTER_ASSIGN_ERROR',
  validate: (data) => data.characterId ? null : 'Character ID required',
  execute: async (ctx, data) => {
    const { characterId, slotIndex } = data;

    // Get user's characters for validation
    const characters = ctx.user.characters || [];

    const result = essenceTapService.assignCharacter(
      ctx.state,
      characterId,
      characters,
      slotIndex
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        characterId,
        slotIndex,
        assignedCharacters: result.newState.assignedCharacters,
        characterBonus: result.characterBonus,
        elementBonuses: result.elementBonuses,
        elementSynergy: result.elementSynergy,
        seriesSynergy: result.seriesSynergy,
        masteryBonus: result.masteryBonus,
        clickPower: result.newState.clickPower,
        productionPerSecond: result.newState.productionPerSecond
      }
    };
  }
});

/**
 * Handle character unassignment
 */
const handleUnassignCharacter = createHandler({
  eventName: 'character_unassigned',
  errorCode: 'CHARACTER_UNASSIGN_ERROR',
  validate: (data) => data.characterId ? null : 'Character ID required',
  execute: async (ctx, data) => {
    const { characterId } = data;

    // Get user's characters for recalculation
    const characters = ctx.user.characters || [];

    const result = essenceTapService.unassignCharacter(
      ctx.state,
      characterId,
      characters
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        characterId,
        assignedCharacters: result.newState.assignedCharacters,
        characterBonus: result.characterBonus,
        elementBonuses: result.elementBonuses,
        elementSynergy: result.elementSynergy,
        seriesSynergy: result.seriesSynergy,
        masteryBonus: result.masteryBonus,
        clickPower: result.newState.clickPower,
        productionPerSecond: result.newState.productionPerSecond
      }
    };
  }
});

module.exports = {
  handleAssignCharacter,
  handleUnassignCharacter
};
