/**
 * Essence Tap Character Service
 *
 * Handles character assignment, mastery, and XP for the Essence Tap minigame.
 */

const { GAME_CONFIG, XP_REWARDS, deriveElement } = require('../../config/essenceTap');
const calculations = require('./calculations');

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
 * Update character mastery hours
 * @param {Object} state - Current state
 * @param {number} hoursElapsed - Hours played since last update
 * @returns {Object} Updated state and level-up info
 */
function updateCharacterMastery(state, hoursElapsed) {
  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return { newState: state, levelUps: [] };
  }

  const newState = { ...state };
  newState.characterMastery = { ...state.characterMastery };
  const levelUps = [];

  for (const charId of state.assignedCharacters) {
    const oldMastery = calculations.calculateCharacterMastery(state.characterMastery, charId);
    const oldData = state.characterMastery?.[charId] || { hoursUsed: 0, level: 1 };

    newState.characterMastery[charId] = {
      hoursUsed: oldData.hoursUsed + hoursElapsed,
      level: oldMastery.level
    };

    const newMastery = calculations.calculateCharacterMastery(newState.characterMastery, charId);
    if (newMastery.level > oldMastery.level) {
      newState.characterMastery[charId].level = newMastery.level;
      levelUps.push({
        characterId: charId,
        oldLevel: oldMastery.level,
        newLevel: newMastery.level,
        unlockedAbility: newMastery.unlockedAbility
      });
    }
  }

  return { newState, levelUps };
}

/**
 * Award XP to characters used in essence tap
 * @param {Object} state - Current state
 * @param {number} essenceEarned - Essence earned
 * @returns {Object} XP awards and updated state
 */
function awardCharacterXP(state, essenceEarned) {
  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return { xpAwarded: {}, newState: state };
  }

  const xpAwarded = {};
  const xpPerMillion = XP_REWARDS.perMillionEssence || 10;
  const baseXP = Math.floor((essenceEarned / 1000000) * xpPerMillion);

  // Each assigned character gets XP based on essence earned
  for (const charId of state.assignedCharacters) {
    const charXP = Math.max(1, Math.floor(baseXP / state.assignedCharacters.length));
    xpAwarded[charId] = charXP;
  }

  const newState = { ...state };
  newState.characterXP = { ...state.characterXP };

  for (const [charId, xp] of Object.entries(xpAwarded)) {
    newState.characterXP[charId] = (state.characterXP?.[charId] || 0) + xp;
  }

  return { xpAwarded, newState };
}

/**
 * Get character's element (with fallback derivation)
 * @param {Object} character - Character object
 * @returns {string} Element name
 */
function getCharacterElement(character) {
  if (character.element) {
    return character.element.toLowerCase();
  }
  return deriveElement(character);
}

/**
 * Get elements for all assigned characters
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @returns {Array} List of { characterId, element }
 */
function getAssignedCharacterElements(state, characters = []) {
  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return [];
  }

  return state.assignedCharacters.map(charId => {
    const char = characters.find(c => c.id === charId || c.characterId === charId);
    return {
      characterId: charId,
      element: char ? getCharacterElement(char) : 'neutral'
    };
  });
}

/**
 * Get character bonus breakdown
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @returns {Object} Detailed bonus breakdown
 */
function getCharacterBonusBreakdown(state, characters = []) {
  const assignedChars = state.assignedCharacters || [];
  const charCollection = characters || [];

  return {
    rarityBonus: calculations.calculateCharacterBonus(assignedChars, charCollection),
    elementBonuses: calculations.calculateElementBonuses(assignedChars, charCollection),
    elementSynergy: calculations.calculateElementSynergy(assignedChars, charCollection),
    seriesSynergy: calculations.calculateSeriesSynergy(assignedChars, charCollection),
    masteryBonus: calculations.calculateTotalMasteryBonus(assignedChars, state.characterMastery),
    underdogBonus: calculations.calculateUnderdogBonus(assignedChars, charCollection),
    assignedCount: assignedChars.length,
    maxAssigned: GAME_CONFIG.maxAssignedCharacters
  };
}

/**
 * Get character mastery info for a specific character
 * @param {Object} state - Current state
 * @param {string} characterId - Character ID
 * @returns {Object} Mastery info
 */
function getCharacterMasteryInfo(state, characterId) {
  return calculations.calculateCharacterMastery(state.characterMastery || {}, characterId);
}

module.exports = {
  assignCharacter,
  unassignCharacter,
  updateCharacterMastery,
  awardCharacterXP,
  getCharacterElement,
  getAssignedCharacterElements,
  getCharacterBonusBreakdown,
  getCharacterMasteryInfo
};
