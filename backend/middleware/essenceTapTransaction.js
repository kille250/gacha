/**
 * Essence Tap Transaction Middleware
 *
 * Provides transaction wrappers for essence tap route handlers to:
 * - Reduce code duplication (65+ transaction patterns in routes)
 * - Ensure consistent transaction handling and error responses
 * - Handle user locking, state loading, and change application
 *
 * BENEFITS:
 * - Eliminates boilerplate: No need to manually manage transactions, locks, or rollbacks
 * - Consistent error handling: Standardized error responses across all routes
 * - Automatic state management: Handles essenceTap state initialization and saving
 * - User change tracking: Automatically applies FP, ticket, and XP changes
 * - Race condition prevention: Built-in pessimistic locking
 *
 * MIGRATION GUIDE:
 * Before (65+ lines of duplicated code):
 *   router.post('/action', auth, async (req, res) => {
 *     const transaction = await sequelize.transaction();
 *     try {
 *       const user = await User.findByPk(req.user.id, { transaction, lock: true });
 *       if (!user) {
 *         await transaction.rollback();
 *         return res.status(404).json({ error: 'User not found' });
 *       }
 *       let state = user.essenceTap || getInitialState();
 *       const characters = await loadUserCharacters(user.id, { transaction });
 *       const result = performAction(state, characters);
 *       if (!result.success) {
 *         await transaction.rollback();
 *         return res.status(400).json({ error: result.error });
 *       }
 *       user.essenceTap = result.newState;
 *       user.lastEssenceTapRequest = Date.now();
 *       if (result.fatePoints) {
 *         // Apply FP changes...
 *       }
 *       await user.save({ transaction });
 *       await transaction.commit();
 *       res.json({ success: true, ...result });
 *     } catch (error) {
 *       await transaction.rollback();
 *       res.status(500).json({ error: 'Failed' });
 *     }
 *   });
 *
 * After (clean and focused):
 *   router.post('/action', auth, withEssenceTransaction(async ({ state, characters }) => {
 *     const result = performAction(state, characters);
 *     if (!result.success) {
 *       return { success: false, error: result.error };
 *     }
 *     return {
 *       success: true,
 *       newState: result.newState,
 *       userChanges: { fatePoints: result.fatePoints },
 *       response: { success: true, ...result }
 *     };
 *   }));
 */

const { User, sequelize } = require('../models');
const stateService = require('../services/essenceTap/stateService');
const shared = require('../services/essenceTap/shared');

/**
 * Basic transaction wrapper for essence tap route handlers
 *
 * @param {Function} handler - Async handler function that receives context and returns result
 * @returns {Function} Express route handler
 *
 * HANDLER CONTEXT:
 * - req: Express request object
 * - res: Express response object
 * - user: User model instance (locked for transaction)
 * - state: User's essenceTap state (or initial state if new)
 * - transaction: Sequelize transaction instance
 *
 * HANDLER RETURN FORMAT:
 * Success:
 *   {
 *     success: true,
 *     newState: <updated state object>,        // Required: New essenceTap state
 *     userChanges: {                           // Optional: Changes to user model
 *       fatePoints: 10,                        // Add 10 FP to user.fatePoints.global.points
 *       rollTickets: 2,                        // Add 2 to user.rollTickets
 *       xp: 50                                 // Add 50 to user.accountXP
 *     },
 *     response: { success: true, ... }         // Required: JSON response to send to client
 *   }
 *
 * Error:
 *   {
 *     success: false,
 *     error: 'Error message',                  // Required: Error message
 *     code: 'ERROR_CODE',                      // Optional: Error code
 *     status: 400                              // Optional: HTTP status (default: 400)
 *   }
 *
 * EXAMPLES:
 *
 * 1. Simple state modification (prestige upgrade):
 *   router.post('/prestige/upgrade', auth, withTransaction(async ({ state, req }) => {
 *     const { upgradeId } = req.body;
 *     const result = actions.purchasePrestigeUpgrade({ state, upgradeId });
 *
 *     if (!result.success) {
 *       return { success: false, error: result.error };
 *     }
 *
 *     return {
 *       success: true,
 *       newState: result.newState,
 *       response: {
 *         success: true,
 *         upgrade: result.upgrade,
 *         cost: result.cost
 *       }
 *     };
 *   }));
 *
 * 2. With user changes (claiming rewards):
 *   router.post('/claim-reward', auth, withTransaction(async ({ state }) => {
 *     const result = actions.claimReward({ state });
 *
 *     if (!result.success) {
 *       return { success: false, error: result.error };
 *     }
 *
 *     return {
 *       success: true,
 *       newState: result.newState,
 *       userChanges: {
 *         fatePoints: result.fpReward,
 *         rollTickets: result.ticketReward,
 *         xp: result.xpReward
 *       },
 *       response: {
 *         success: true,
 *         rewards: result.rewards
 *       }
 *     };
 *   }));
 *
 * 3. Error handling with custom status:
 *   router.post('/action', auth, withTransaction(async ({ state }) => {
 *     if (!state.someRequirement) {
 *       return {
 *         success: false,
 *         error: 'Requirement not met',
 *         code: 'REQUIREMENT_NOT_MET',
 *         status: 403
 *       };
 *     }
 *     // ... rest of handler
 *   }));
 */
function withTransaction(handler) {
  return async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      // Load user with pessimistic lock
      const user = await User.findByPk(req.user.id, { transaction, lock: true });

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ error: 'User not found' });
      }

      // Get initial state
      const state = user.essenceTap || stateService.getInitialState();

      // Call handler
      const result = await handler({ req, res, user, state, transaction });

      // If handler already sent response (early return), rollback and exit
      if (res.headersSent) {
        await transaction.rollback();
        return;
      }

      // Handle error results
      if (!result.success) {
        await transaction.rollback();
        const status = result.status || 400;
        return res.status(status).json({
          error: result.error,
          ...(result.code && { code: result.code })
        });
      }

      // Apply state changes
      if (result.newState) {
        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;
        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
      }

      // Apply user changes (FP, tickets, XP)
      if (result.userChanges) {
        shared.applyUserChanges(user, result.userChanges);
      }

      // Save user
      await user.save({ transaction });
      await transaction.commit();

      // Send response
      res.json(result.response);
    } catch (error) {
      await transaction.rollback();
      console.error('Transaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Enhanced transaction wrapper that also loads user characters
 *
 * @param {Function} handler - Async handler function
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.loadCharacters=true] - Whether to load characters
 * @param {boolean} [options.applyPassiveGains=false] - Whether to automatically apply passive gains before handler
 * @returns {Function} Express route handler
 *
 * HANDLER CONTEXT (same as withTransaction, plus):
 * - characters: Array of user's characters with formatted data
 *   Format: [{ id, characterId, rarity, element, series, name, imageUrl }, ...]
 *
 * HANDLER RETURN FORMAT: Same as withTransaction
 *
 * OPTIONS:
 * - loadCharacters (default: true): Load user's characters from database
 * - applyPassiveGains (default: false): Apply passive essence gains before calling handler
 *
 * EXAMPLES:
 *
 * 1. Using characters for calculations (boss attack):
 *   router.post('/boss/attack', auth, withEssenceTransaction(async ({ state, characters, req }) => {
 *     const { damage } = req.body;
 *     const result = actions.attackBoss({ state, damage, characters });
 *
 *     if (!result.success) {
 *       return { success: false, error: result.error, code: result.code };
 *     }
 *
 *     return {
 *       success: true,
 *       newState: result.newState,
 *       userChanges: result.userChanges,
 *       response: {
 *         success: true,
 *         damageDealt: result.damageDealt,
 *         bossHealth: result.bossHealth,
 *         defeated: result.defeated,
 *         rewards: result.rewards
 *       }
 *     };
 *   }));
 *
 * 2. With passive gains applied (purchase generator):
 *   router.post('/generator/buy', auth, withEssenceTransaction(async ({ state, characters, req }) => {
 *     const { generatorId, count } = req.body;
 *
 *     // Passive gains already applied by middleware
 *     const result = actions.purchaseGenerator({ state, generatorId, count });
 *
 *     if (!result.success) {
 *       return { success: false, error: result.error };
 *     }
 *
 *     return {
 *       success: true,
 *       newState: result.newState,
 *       response: {
 *         success: true,
 *         generator: result.generator,
 *         cost: result.cost,
 *         essence: result.newState.essence
 *       }
 *     };
 *   }, { applyPassiveGains: true }));
 *
 * 3. Without loading characters (state-only action):
 *   router.post('/simple-action', auth, withEssenceTransaction(async ({ state, req }) => {
 *     // Characters not needed for this action
 *     const result = actions.simpleAction({ state, req.body });
 *
 *     if (!result.success) {
 *       return { success: false, error: result.error };
 *     }
 *
 *     return {
 *       success: true,
 *       newState: result.newState,
 *       response: { success: true, data: result.data }
 *     };
 *   }, { loadCharacters: false }));
 *
 * 4. Manual character filtering (synergy system):
 *   router.post('/assign-character', auth, withEssenceTransaction(async ({ state, characters, req }) => {
 *     const { characterId } = req.body;
 *
 *     // Filter to find specific character
 *     const character = characters.find(c => c.id === characterId);
 *     if (!character) {
 *       return { success: false, error: 'Character not found', status: 404 };
 *     }
 *
 *     const result = actions.assignCharacter({ state, character });
 *
 *     if (!result.success) {
 *       return { success: false, error: result.error };
 *     }
 *
 *     return {
 *       success: true,
 *       newState: result.newState,
 *       response: { success: true, synergies: result.synergies }
 *     };
 *   }));
 */
function withEssenceTransaction(handler, options = {}) {
  const { loadCharacters = true, applyPassiveGains = false } = options;

  return async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      // Load user with pessimistic lock
      const user = await User.findByPk(req.user.id, { transaction, lock: true });

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ error: 'User not found' });
      }

      // Get initial state
      let state = user.essenceTap || stateService.getInitialState();

      // Load characters if requested
      let characters = [];
      if (loadCharacters) {
        characters = await shared.loadUserCharacters(req.user.id, { transaction });
      }

      // Apply passive gains if requested
      if (applyPassiveGains && characters.length > 0) {
        const passiveResult = shared.applyPassiveGains(state, characters);
        state = passiveResult.state;
      }

      // Call handler
      const result = await handler({ req, res, user, state, transaction, characters });

      // If handler already sent response (early return), rollback and exit
      if (res.headersSent) {
        await transaction.rollback();
        return;
      }

      // Handle error results
      if (!result.success) {
        await transaction.rollback();
        const status = result.status || 400;
        return res.status(status).json({
          error: result.error,
          ...(result.code && { code: result.code })
        });
      }

      // Apply state changes
      if (result.newState) {
        const now = Date.now();
        result.newState.lastOnlineTimestamp = now;
        user.essenceTap = result.newState;
        user.lastEssenceTapRequest = now;
      }

      // Apply user changes (FP, tickets, XP)
      if (result.userChanges) {
        shared.applyUserChanges(user, result.userChanges);
      }

      // Save user
      await user.save({ transaction });
      await transaction.commit();

      // Send response
      res.json(result.response);
    } catch (error) {
      await transaction.rollback();
      console.error('Transaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = {
  withTransaction,
  withEssenceTransaction
};
