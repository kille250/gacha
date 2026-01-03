/**
 * Essence Tap WebSocket Actions
 *
 * Provides WebSocket-specific wrappers around the unified action handlers.
 * These wrappers handle:
 *   - Transaction management with row locking
 *   - Loading user state and characters
 *   - Applying passive gains
 *   - Saving state and broadcasting results
 *
 * This eliminates duplication between REST routes and WebSocket handlers
 * while preserving WebSocket-specific features (broadcast, clientSeq, etc.)
 */

const { User, UserCharacter, sequelize } = require('../models');
const { actions, getInitialState, resetDaily, resetWeeklyFPIfNeeded } = require('../services/essenceTap');
const essenceTapService = require('../services/essenceTapService');

/**
 * Execute a WebSocket action with standard transaction handling
 *
 * @param {Object} options - Action options
 * @param {number} options.userId - User ID
 * @param {Object} options.socket - Socket instance
 * @param {Function} options.namespace - Socket namespace for broadcast
 * @param {number} [options.clientSeq] - Client sequence number
 * @param {Function} options.action - Action to execute (receives { state, characters, user })
 * @param {Function} options.getResponse - Function to build broadcast response
 * @param {string} options.successEvent - Event name for success broadcast
 * @param {string} [options.errorCode] - Error code for failures
 * @param {boolean} [options.loadCharacters=true] - Whether to load characters
 * @param {boolean} [options.applyPassive=true] - Whether to apply passive gains
 * @returns {Promise<Object>} Action result
 */
async function executeAction(options) {
  const {
    userId,
    socket,
    namespace,
    clientSeq,
    action,
    getResponse,
    successEvent,
    errorCode = 'ACTION_FAILED',
    loadCharacters = true,
    applyPassive = true,
    broadcastToUser
  } = options;

  const transaction = await sequelize.transaction();

  try {
    // Load user with row lock
    const user = await User.findByPk(userId, { transaction, lock: true });
    if (!user) {
      await transaction.rollback();
      socket.emit('action_rejected', {
        clientSeq,
        reason: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return { success: false, error: 'User not found' };
    }

    // Get and prepare state
    let state = user.essenceTap || getInitialState();
    state = resetDaily(state);
    state = resetWeeklyFPIfNeeded(state);

    // Load characters if needed
    let characters = [];
    if (loadCharacters) {
      const userCharacters = await UserCharacter.findAll({
        where: { UserId: userId },
        include: ['Character'],
        transaction
      });

      characters = userCharacters.map(uc => ({
        id: uc.CharacterId,
        characterId: uc.CharacterId,
        rarity: uc.Character?.rarity || 'common',
        element: uc.Character?.element || 'neutral',
        series: uc.Character?.series || 'unknown',
        name: uc.Character?.name || 'Unknown'
      }));
    }

    // Apply passive gains if needed
    if (applyPassive) {
      const now = Date.now();
      const lastUpdate = state.lastOnlineTimestamp || now;
      const elapsedMs = now - lastUpdate;
      const elapsedSeconds = Math.min(elapsedMs / 1000, 300);

      if (elapsedSeconds > 1) {
        const productionPerSecond = essenceTapService.calculateProductionPerSecond(state, characters);
        const activeEffects = essenceTapService.getActiveAbilityEffects(state);
        const effectiveProduction = productionPerSecond * (activeEffects.productionMultiplier || 1);
        const passiveGain = Math.floor(effectiveProduction * elapsedSeconds);

        if (passiveGain > 0) {
          state.essence = (state.essence || 0) + passiveGain;
          state.lifetimeEssence = (state.lifetimeEssence || 0) + passiveGain;
        }
        state.lastOnlineTimestamp = now;
      }
    }

    // Execute the action
    const result = await action({ state, characters, user, transaction });

    if (!result.success) {
      await transaction.rollback();
      socket.emit('action_rejected', {
        clientSeq,
        reason: result.error,
        code: result.code || errorCode,
        correctState: { essence: state.essence }
      });
      return result;
    }

    // Save state
    const now = Date.now();
    if (result.newState) {
      result.newState.lastOnlineTimestamp = now;
      user.essenceTap = result.newState;
    }
    user.lastEssenceTapRequest = now;

    // Apply FP if awarded
    if (result.fatePointsToAward && result.fatePointsToAward > 0) {
      const fatePoints = user.fatePoints || {};
      fatePoints.global = fatePoints.global || { points: 0 };
      fatePoints.global.points = (fatePoints.global.points || 0) + result.fatePointsToAward;
      user.fatePoints = fatePoints;
    }

    // Apply tickets if awarded
    if (result.rollTicketsToAward) {
      user.rollTickets = (user.rollTickets || 0) + result.rollTicketsToAward;
    }

    // Apply XP if awarded
    if (result.xpToAward) {
      user.accountXP = (user.accountXP || 0) + result.xpToAward;
    }

    await user.save({ transaction });
    await transaction.commit();

    // Build response
    const response = getResponse ? getResponse(result, { state: result.newState || state, characters, now }) : result;
    response.clientSeq = clientSeq;
    response.serverTimestamp = now;

    // Broadcast to all user's tabs
    if (broadcastToUser && successEvent) {
      broadcastToUser(namespace, userId, successEvent, response);
    } else if (successEvent) {
      socket.emit(successEvent, response);
    }

    return { success: true, ...result };

  } catch (err) {
    await transaction.rollback();
    console.error(`[EssenceTap WS] Action error:`, err);
    socket.emit('error', { code: errorCode, message: 'Action failed' });
    return { success: false, error: err.message };
  }
}

/**
 * Create a handler for generator purchase via WebSocket
 */
function createGeneratorPurchaseHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, generatorId, count, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'PURCHASE_FAILED',
      action: async ({ state, characters }) => {
        const result = actions.purchaseGenerator({
          state,
          generatorId,
          count
        });

        if (result.success) {
          const gameState = essenceTapService.getGameState(result.newState, characters);
          result.productionPerSecond = gameState.productionPerSecond;
        }

        return result;
      },
      getResponse: (result, { state, characters }) => {
        const gameState = essenceTapService.getGameState(state, characters);
        return {
          essence: state.essence,
          lifetimeEssence: state.lifetimeEssence,
          generators: state.generators,
          productionPerSecond: gameState.productionPerSecond,
          generator: result.generator,
          newCount: result.newCount,
          cost: result.cost
        };
      },
      successEvent: 'state_delta'
    });
  };
}

/**
 * Create a handler for upgrade purchase via WebSocket
 */
function createUpgradePurchaseHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, upgradeId, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'PURCHASE_FAILED',
      action: async ({ state }) => {
        return actions.purchaseUpgrade({
          state,
          upgradeId
        });
      },
      getResponse: (result, { state, characters }) => {
        const gameState = essenceTapService.getGameState(state, characters);
        return {
          essence: state.essence,
          lifetimeEssence: state.lifetimeEssence,
          purchasedUpgrades: state.purchasedUpgrades,
          clickPower: gameState.clickPower,
          productionPerSecond: gameState.productionPerSecond,
          upgrade: result.upgrade,
          cost: result.cost
        };
      },
      successEvent: 'state_delta'
    });
  };
}

/**
 * Create a handler for gamble action via WebSocket
 */
function createGambleHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, betAmount, betType, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'GAMBLE_FAILED',
      action: async ({ state }) => {
        return actions.performGamble({
          state,
          betAmount,
          betType,
          userId
        });
      },
      getResponse: (result, { state }) => ({
        won: result.won,
        betAmount: result.betAmount,
        betType: result.betType,
        multiplier: result.multiplier,
        essenceChange: result.essenceChange,
        newEssence: result.newEssence,
        jackpotWin: result.jackpotWin,
        gambleInfo: actions.getGambleInfo(state)
      }),
      successEvent: 'gamble_result'
    });
  };
}

/**
 * Create a handler for infusion action via WebSocket
 */
function createInfusionHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'INFUSION_FAILED',
      action: async ({ state }) => {
        return actions.performInfusion({ state });
      },
      getResponse: (result, { state }) => ({
        cost: result.cost,
        bonusGained: result.bonusGained,
        totalBonus: result.totalBonus,
        infusionCount: result.infusionCount,
        essence: state.essence,
        infusionInfo: actions.getInfusionInfo(state)
      }),
      successEvent: 'infusion_result'
    });
  };
}

/**
 * Create a handler for ability activation via WebSocket
 */
function createAbilityHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, abilityId, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'ABILITY_FAILED',
      loadCharacters: false,
      applyPassive: false,
      action: async ({ state }) => {
        return actions.activateAbility({ state, abilityId });
      },
      getResponse: (result, { state }) => ({
        ability: result.ability,
        duration: result.duration,
        effects: result.effects,
        bonusEssence: result.bonusEssence,
        essence: state.essence,
        activeAbilities: result.activeAbilities
      }),
      successEvent: 'ability_activated'
    });
  };
}

/**
 * Create a handler for character assignment via WebSocket
 */
function createCharacterAssignHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, characterId, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'ASSIGN_FAILED',
      action: async ({ state, characters }) => {
        return actions.assignCharacter({
          state,
          characterId,
          ownedCharacters: characters
        });
      },
      getResponse: (result, { state }) => ({
        assignedCharacters: result.assignedCharacters,
        bonuses: result.bonuses
      }),
      successEvent: 'character_assigned'
    });
  };
}

module.exports = {
  executeAction,
  createGeneratorPurchaseHandler,
  createUpgradePurchaseHandler,
  createGambleHandler,
  createInfusionHandler,
  createAbilityHandler,
  createCharacterAssignHandler
};
