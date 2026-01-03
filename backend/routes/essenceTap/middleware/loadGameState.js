/**
 * Load Game State Middleware
 *
 * Loads user, essence tap state, and characters for use in route handlers.
 * This middleware extracts the common pattern found in every essence tap endpoint.
 *
 * Usage:
 *   router.post('/endpoint', loadGameState, async (req, res) => {
 *     // Access via req.gameState, req.gameCharacters, req.gameUser
 *     const result = someAction({ state: req.gameState, ... });
 *     req.gameState = result.newState;  // Update for save middleware
 *   });
 */

const { User, UserCharacter, Character } = require('../../../models');
const { getInitialState, resetDaily } = require('../../essenceTap');
const { deriveElement } = require('../../../config/essenceTap');

/**
 * Load game state middleware
 * Sets req.gameUser, req.gameState, and req.gameCharacters
 */
async function loadGameState(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Load user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or initialize essence tap state
    let state = user.essenceTap || getInitialState();

    // Reset daily counters if needed
    state = resetDaily(state);

    // Load characters
    const userCharacters = await UserCharacter.findAll({
      where: { userId },
      include: [{ model: Character, as: 'character' }]
    });

    const characters = userCharacters.map(uc => ({
      id: uc.character.id,
      characterId: uc.character.id,
      name: uc.character.name,
      element: deriveElement(uc.character),
      series: uc.character.series,
      rarity: uc.character.rarity,
      imageUrl: uc.character.imageUrl,
      obtainedAt: uc.createdAt
    }));

    // Attach to request
    req.gameUser = user;
    req.gameState = state;
    req.gameCharacters = characters;
    req.gameStateChanged = false;

    next();
  } catch (error) {
    console.error('Error in loadGameState middleware:', error);
    res.status(500).json({ error: 'Failed to load game state' });
  }
}

/**
 * Light version that only loads user and state (no characters)
 * Faster for endpoints that don't need character data
 */
async function loadGameStateLight(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let state = user.essenceTap || getInitialState();
    state = resetDaily(state);

    req.gameUser = user;
    req.gameState = state;
    req.gameCharacters = null; // Indicate characters not loaded
    req.gameStateChanged = false;

    next();
  } catch (error) {
    console.error('Error in loadGameStateLight middleware:', error);
    res.status(500).json({ error: 'Failed to load game state' });
  }
}

module.exports = {
  loadGameState,
  loadGameStateLight
};
