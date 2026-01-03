/**
 * Character Action
 *
 * Unified character assignment handling for REST and WebSocket.
 */

const calculations = require('../calculations');
const { GAME_CONFIG } = require('../../../config/essenceTap');

/**
 * Character action result
 * @typedef {Object} CharacterActionResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [newState] - Updated state
 * @property {string[]} [assignedCharacters] - Updated assigned characters
 * @property {Object} [bonuses] - Updated bonus calculations
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Assign a character to the Essence Tap team
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string|number} params.characterId - Character ID to assign
 * @param {Array} params.ownedCharacters - User's owned characters
 * @returns {CharacterActionResult} Action result
 */
function assignCharacter({ state, characterId, ownedCharacters = [] }) {
  if (!characterId) {
    return {
      success: false,
      error: 'Character ID required',
      code: 'INVALID_REQUEST'
    };
  }

  // Check if character is owned
  const owned = ownedCharacters.find(c => c.id === characterId || c.characterId === characterId);
  if (!owned) {
    return {
      success: false,
      error: 'Character not owned',
      code: 'CHARACTER_NOT_OWNED'
    };
  }

  // Check if already assigned
  const assignedCharacters = state.assignedCharacters || [];
  if (assignedCharacters.includes(characterId)) {
    return {
      success: false,
      error: 'Character already assigned',
      code: 'ALREADY_ASSIGNED'
    };
  }

  // Check max assigned limit
  const maxAssigned = GAME_CONFIG.maxAssignedCharacters;
  if (assignedCharacters.length >= maxAssigned) {
    return {
      success: false,
      error: `Maximum ${maxAssigned} characters can be assigned`,
      code: 'MAX_CHARACTERS_ASSIGNED'
    };
  }

  // Apply assignment
  const newState = { ...state };
  newState.assignedCharacters = [...assignedCharacters, characterId];
  newState.lastOnlineTimestamp = Date.now();

  // Calculate updated bonuses
  const bonuses = calculateCharacterBonuses(newState, ownedCharacters);

  return {
    success: true,
    newState,
    assignedCharacters: newState.assignedCharacters,
    bonuses
  };
}

/**
 * Unassign a character from the Essence Tap team
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string|number} params.characterId - Character ID to unassign
 * @param {Array} params.ownedCharacters - User's owned characters (for recalculating bonuses)
 * @returns {CharacterActionResult} Action result
 */
function unassignCharacter({ state, characterId, ownedCharacters = [] }) {
  if (!characterId) {
    return {
      success: false,
      error: 'Character ID required',
      code: 'INVALID_REQUEST'
    };
  }

  // Check if character is assigned
  const assignedCharacters = state.assignedCharacters || [];
  if (!assignedCharacters.includes(characterId)) {
    return {
      success: false,
      error: 'Character not assigned',
      code: 'NOT_ASSIGNED'
    };
  }

  // Remove character
  const newState = { ...state };
  newState.assignedCharacters = assignedCharacters.filter(id => id !== characterId);
  newState.lastOnlineTimestamp = Date.now();

  // Calculate updated bonuses
  const bonuses = calculateCharacterBonuses(newState, ownedCharacters);

  return {
    success: true,
    newState,
    assignedCharacters: newState.assignedCharacters,
    bonuses
  };
}

/**
 * Swap one assigned character for another (atomic operation)
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string|number} params.oldCharacterId - Character ID to remove
 * @param {string|number} params.newCharacterId - Character ID to add
 * @param {Array} params.ownedCharacters - User's owned characters
 * @returns {CharacterActionResult} Action result
 */
function swapCharacter({ state, oldCharacterId, newCharacterId, ownedCharacters = [] }) {
  if (!oldCharacterId || !newCharacterId) {
    return {
      success: false,
      error: 'Both old and new character IDs required',
      code: 'INVALID_REQUEST'
    };
  }

  // Check if old character is assigned
  const assignedCharacters = state.assignedCharacters || [];
  if (!assignedCharacters.includes(oldCharacterId)) {
    return {
      success: false,
      error: 'Old character not assigned',
      code: 'NOT_ASSIGNED'
    };
  }

  // Check if new character is owned
  const owned = ownedCharacters.find(c => c.id === newCharacterId || c.characterId === newCharacterId);
  if (!owned) {
    return {
      success: false,
      error: 'New character not owned',
      code: 'CHARACTER_NOT_OWNED'
    };
  }

  // Check if new character is already assigned
  if (assignedCharacters.includes(newCharacterId)) {
    return {
      success: false,
      error: 'New character already assigned',
      code: 'ALREADY_ASSIGNED'
    };
  }

  // Perform atomic swap
  const newState = { ...state };
  newState.assignedCharacters = assignedCharacters.map(id =>
    id === oldCharacterId ? newCharacterId : id
  );
  newState.lastOnlineTimestamp = Date.now();

  // Calculate updated bonuses
  const bonuses = calculateCharacterBonuses(newState, ownedCharacters);

  return {
    success: true,
    newState,
    assignedCharacters: newState.assignedCharacters,
    oldCharacterId,
    newCharacterId,
    bonuses
  };
}

/**
 * Calculate all character-related bonuses
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @returns {Object} All bonus calculations
 */
function calculateCharacterBonuses(state, characters = []) {
  return {
    characterBonus: calculations.calculateCharacterBonus(state.assignedCharacters, characters),
    elementBonuses: calculations.calculateElementBonuses(state.assignedCharacters, characters),
    elementSynergy: calculations.calculateElementSynergy(state.assignedCharacters, characters),
    seriesSynergy: calculations.calculateSeriesSynergy(state.assignedCharacters, characters),
    masteryBonus: calculations.calculateTotalMasteryBonus(state.assignedCharacters, state.characterMastery),
    underdogBonus: calculations.calculateUnderdogBonus(state.assignedCharacters, characters),
    clickPower: calculations.calculateClickPower(state, characters),
    productionPerSecond: calculations.calculateProductionPerSecond(state, characters)
  };
}

/**
 * Get synergy preview for a potential character assignment
 * @param {Object} params - Parameters
 * @param {Object} params.state - Current state
 * @param {string|number} params.characterId - Character to preview
 * @param {Array} params.ownedCharacters - User's owned characters
 * @returns {Object} Synergy preview
 */
function getSynergyPreview({ state, characterId, ownedCharacters = [] }) {
  // Create temporary state with the character assigned
  const tempState = { ...state };
  const currentAssigned = state.assignedCharacters || [];

  if (currentAssigned.includes(characterId)) {
    // Already assigned, return current bonuses
    return {
      current: calculateCharacterBonuses(state, ownedCharacters),
      preview: calculateCharacterBonuses(state, ownedCharacters),
      wouldAssign: false
    };
  }

  if (currentAssigned.length >= GAME_CONFIG.maxAssignedCharacters) {
    // Would need to swap
    return {
      current: calculateCharacterBonuses(state, ownedCharacters),
      preview: null,
      wouldAssign: false,
      error: 'Team is full'
    };
  }

  tempState.assignedCharacters = [...currentAssigned, characterId];

  return {
    current: calculateCharacterBonuses(state, ownedCharacters),
    preview: calculateCharacterBonuses(tempState, ownedCharacters),
    wouldAssign: true
  };
}

module.exports = {
  assignCharacter,
  unassignCharacter,
  swapCharacter,
  calculateCharacterBonuses,
  getSynergyPreview
};
