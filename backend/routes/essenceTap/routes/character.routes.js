/**
 * Character Routes
 *
 * Handles character assignment, unassignment, bonuses, and mastery.
 */

const express = require('express');
const router = express.Router();
const { UserCharacter } = require('../../../models');
const essenceTapService = require('../../../services/essenceTapService');
const { createRoute, createGetRoute } = require('../createRoute');

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get user's characters for bonus calculations
 */
async function getUserCharacters(userId) {
  const userCharacters = await UserCharacter.findAll({
    where: { UserId: userId },
    include: ['Character']
  });

  return userCharacters.map(uc => ({
    id: uc.CharacterId,
    rarity: uc.Character?.rarity || 'common',
    element: uc.Character?.element || 'neutral',
    series: uc.Character?.series
  }));
}

// ===========================================
// CHARACTER ASSIGNMENT
// ===========================================

/**
 * POST /character/assign
 * Assign a character for production bonus
 */
router.post('/assign', createRoute({
  validate: (body) => body.characterId ? null : 'Character ID required',
  execute: async (ctx) => {
    const { characterId, slotIndex } = ctx.body;

    // Get user's characters for validation
    const characters = await getUserCharacters(ctx.user.id);

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
}));

/**
 * POST /character/unassign
 * Unassign a character
 */
router.post('/unassign', createRoute({
  validate: (body) => body.characterId ? null : 'Character ID required',
  execute: async (ctx) => {
    const { characterId } = ctx.body;

    // Get user's characters for recalculation
    const characters = await getUserCharacters(ctx.user.id);

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
}));

// ===========================================
// CHARACTER INFO
// ===========================================

/**
 * GET /character/bonuses
 * Get character bonuses and synergies
 */
router.get('/bonuses', createGetRoute(async (state, user) => {
  const characters = await getUserCharacters(user.id);

  const characterBonuses = essenceTapService.calculateCharacterBonuses(state, characters);
  const elementBonuses = essenceTapService.calculateElementBonuses(state, characters);
  const elementSynergy = essenceTapService.calculateElementSynergy(state, characters);
  const seriesSynergy = essenceTapService.calculateSeriesSynergy(state, characters);
  const masteryBonus = essenceTapService.calculateTotalMasteryBonus(state);

  return {
    assignedCharacters: state.assignedCharacters || [],
    characterBonuses,
    elementBonuses,
    elementSynergy,
    seriesSynergy,
    masteryBonus,
    clickPower: state.clickPower || 1,
    productionPerSecond: state.productionPerSecond || 0
  };
}));

/**
 * GET /mastery
 * Get character mastery info for assigned characters
 */
router.get('/mastery', createGetRoute((state) => {
  const masteryInfo = {};

  for (const charId of state.assignedCharacters || []) {
    masteryInfo[charId] = essenceTapService.calculateCharacterMastery(state, charId);
  }

  const totalBonus = essenceTapService.calculateTotalMasteryBonus(state);

  return {
    characterMastery: masteryInfo,
    totalBonus,
    masteryConfig: essenceTapService.CHARACTER_MASTERY
  };
}));

module.exports = router;
