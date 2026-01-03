/**
 * Essence Tap Actions Module
 *
 * Unified action handlers for both REST and WebSocket endpoints.
 * Each action:
 *   1. Validates input
 *   2. Loads user/state with transaction
 *   3. Executes business logic
 *   4. Saves state
 *   5. Returns result
 *
 * This removes duplication between routes and WebSocket handlers.
 */

const tapAction = require('./tapAction');
const generatorAction = require('./generatorAction');
const upgradeAction = require('./upgradeAction');
const prestigeAction = require('./prestigeAction');
const characterAction = require('./characterAction');

module.exports = {
  // Tap actions
  processTaps: tapAction.processTaps,

  // Generator actions
  purchaseGenerator: generatorAction.purchaseGenerator,

  // Upgrade actions
  purchaseUpgrade: upgradeAction.purchaseUpgrade,
  purchasePrestigeUpgrade: upgradeAction.purchasePrestigeUpgrade,

  // Prestige actions
  performPrestige: prestigeAction.performPrestige,

  // Character actions
  assignCharacter: characterAction.assignCharacter,
  unassignCharacter: characterAction.unassignCharacter,
  swapCharacter: characterAction.swapCharacter,

  // Re-export individual modules for specific imports
  tapAction,
  generatorAction,
  upgradeAction,
  prestigeAction,
  characterAction
};
