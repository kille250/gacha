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
const { actions, getInitialState, resetDaily, resetWeeklyFPIfNeeded, applyFPWithCap } = require('../services/essenceTap');
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
    console.error('[EssenceTap WS] Action error:', err);
    socket.emit('error', { code: errorCode, message: 'Action failed' });
    return { success: false, error: err.message };
  }
}

// ===========================================
// PURCHASE HANDLERS
// ===========================================

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
 * Create a handler for prestige upgrade purchase via WebSocket
 */
function createPrestigeUpgradePurchaseHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, upgradeId, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'PURCHASE_FAILED',
      action: async ({ state }) => {
        return actions.purchasePrestigeUpgrade({
          state,
          upgradeId
        });
      },
      getResponse: (result, { state }) => ({
        prestigeShards: state.prestigeShards,
        prestigeUpgrades: state.prestigeUpgrades,
        upgrade: result.upgrade,
        newLevel: result.newLevel,
        cost: result.cost
      }),
      successEvent: 'prestige_upgrade_purchased'
    });
  };
}

// ===========================================
// PRESTIGE HANDLER
// ===========================================

/**
 * Create a handler for prestige action via WebSocket
 */
function createPrestigeHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'PRESTIGE_FAILED',
      action: async ({ state }) => {
        const result = actions.performPrestige({ state });
        if (result.success) {
          result.fatePointsToAward = result.fatePointsReward;
          result.xpToAward = result.xpReward;
        }
        return result;
      },
      getResponse: (result, { state, characters }) => {
        const gameState = essenceTapService.getGameState(state, characters);
        return {
          ...gameState,
          shardsEarned: result.shardsEarned,
          totalShards: result.totalShards,
          prestigeLevel: result.prestigeLevel,
          fatePointsReward: result.fatePointsReward,
          xpReward: result.xpReward,
          startingEssence: result.startingEssence
        };
      },
      successEvent: 'prestige_complete'
    });
  };
}

// ===========================================
// GAMBLE & INFUSION HANDLERS
// ===========================================

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

// ===========================================
// ABILITY HANDLER
// ===========================================

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

// ===========================================
// CHARACTER HANDLERS
// ===========================================

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
      getResponse: (result, { state, characters }) => {
        const gameState = essenceTapService.getGameState(state, characters);
        return {
          assignedCharacters: result.assignedCharacters,
          characterBonus: gameState.characterBonus,
          elementBonuses: gameState.elementBonuses,
          elementSynergy: gameState.elementSynergy,
          seriesSynergy: gameState.seriesSynergy,
          masteryBonus: gameState.masteryBonus,
          clickPower: gameState.clickPower,
          productionPerSecond: gameState.productionPerSecond
        };
      },
      successEvent: 'character_assigned'
    });
  };
}

/**
 * Create a handler for character unassignment via WebSocket
 */
function createCharacterUnassignHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, characterId, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'UNASSIGN_FAILED',
      action: async ({ state, characters }) => {
        return actions.unassignCharacter({
          state,
          characterId,
          ownedCharacters: characters
        });
      },
      getResponse: (result, { state, characters }) => {
        const gameState = essenceTapService.getGameState(state, characters);
        return {
          assignedCharacters: result.assignedCharacters,
          characterBonus: gameState.characterBonus,
          elementBonuses: gameState.elementBonuses,
          elementSynergy: gameState.elementSynergy,
          seriesSynergy: gameState.seriesSynergy,
          masteryBonus: gameState.masteryBonus,
          clickPower: gameState.clickPower,
          productionPerSecond: gameState.productionPerSecond
        };
      },
      successEvent: 'character_unassigned'
    });
  };
}

/**
 * Create a handler for character swap via WebSocket
 */
function createCharacterSwapHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, oldCharacterId, newCharacterId, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'SWAP_FAILED',
      action: async ({ state, characters }) => {
        return actions.swapCharacter({
          state,
          oldCharacterId,
          newCharacterId,
          ownedCharacters: characters
        });
      },
      getResponse: (result, { state, characters }) => {
        const gameState = essenceTapService.getGameState(state, characters);
        return {
          oldCharacterId,
          newCharacterId,
          assignedCharacters: result.assignedCharacters,
          characterBonus: gameState.characterBonus,
          elementBonuses: gameState.elementBonuses,
          elementSynergy: gameState.elementSynergy,
          seriesSynergy: gameState.seriesSynergy,
          masteryBonus: gameState.masteryBonus,
          clickPower: gameState.clickPower,
          productionPerSecond: gameState.productionPerSecond
        };
      },
      successEvent: 'character_swapped'
    });
  };
}

// ===========================================
// MILESTONE & CHALLENGE HANDLERS
// ===========================================

/**
 * Create a handler for milestone claim via WebSocket
 */
function createMilestoneClaimHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, milestoneKey, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'CLAIM_FAILED',
      loadCharacters: false,
      action: async ({ state }) => {
        const result = actions.claimMilestone({ state, milestoneKey });
        if (result.success && result.fatePoints > 0) {
          result.fatePointsToAward = result.fatePoints;
        }
        return result;
      },
      getResponse: (result, { state }) => ({
        milestoneKey,
        fatePoints: result.fatePoints,
        claimedMilestones: state.claimedMilestones
      }),
      successEvent: 'milestone_claimed'
    });
  };
}

/**
 * Create a handler for repeatable milestone claim via WebSocket
 */
function createRepeatableMilestoneClaimHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, milestoneType, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'CLAIM_FAILED',
      loadCharacters: false,
      action: async ({ state }) => {
        const result = actions.claimRepeatableMilestone({ state, milestoneType });
        if (result.success && result.fatePoints > 0) {
          result.fatePointsToAward = result.fatePoints;
        }
        return result;
      },
      getResponse: (result, { state }) => ({
        milestoneType,
        fatePoints: result.fatePoints,
        count: result.count,
        repeatableMilestones: state.repeatableMilestones
      }),
      successEvent: 'repeatable_milestone_claimed'
    });
  };
}

/**
 * Create a handler for daily challenge claim via WebSocket
 */
function createDailyChallengeClaimHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, challengeId, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'CLAIM_FAILED',
      loadCharacters: false,
      action: async ({ state }) => {
        const result = actions.claimDailyChallenge({ state, challengeId });
        if (result.success && result.rewards) {
          result.fatePointsToAward = result.rewards.fatePoints || 0;
          result.rollTicketsToAward = result.rewards.rollTickets || 0;
        }
        return result;
      },
      getResponse: (result, { state }) => ({
        challengeId,
        challenge: result.challenge,
        rewards: result.rewards,
        essence: state.essence,
        daily: state.daily
      }),
      successEvent: 'daily_challenge_claimed'
    });
  };
}

/**
 * Create a handler for session milestone claim via WebSocket
 */
function createSessionMilestoneClaimHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, milestoneType, milestoneName, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'CLAIM_FAILED',
      loadCharacters: false,
      action: async ({ state }) => {
        // Session milestones are tracked in sessionStats
        const sessionStats = state.sessionStats || {};
        const claimedList = sessionStats[`claimed${milestoneType.charAt(0).toUpperCase() + milestoneType.slice(1)}Milestones`] || [];

        if (claimedList.includes(milestoneName)) {
          return { success: false, error: 'Already claimed', code: 'ALREADY_CLAIMED' };
        }

        // Award essence based on milestone type
        const rewards = { essence: 0 };
        // This would normally look up the milestone reward from config
        rewards.essence = 1000; // Placeholder

        state.essence = (state.essence || 0) + rewards.essence;
        claimedList.push(milestoneName);
        sessionStats[`claimed${milestoneType.charAt(0).toUpperCase() + milestoneType.slice(1)}Milestones`] = claimedList;
        state.sessionStats = sessionStats;

        return {
          success: true,
          newState: state,
          rewards,
          milestoneName
        };
      },
      getResponse: (result, { state }) => ({
        milestoneName: result.milestoneName,
        rewards: result.rewards,
        essence: state.essence,
        sessionStats: state.sessionStats
      }),
      successEvent: 'session_milestone_claimed'
    });
  };
}

// ===========================================
// TOURNAMENT HANDLERS
// ===========================================

/**
 * Create a handler for tournament reward claim via WebSocket
 */
function createTournamentRewardsClaimHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'CLAIM_FAILED',
      loadCharacters: false,
      action: async ({ state }) => {
        const result = actions.claimWeeklyRewards({ state });
        if (result.success && result.rewards) {
          // Apply FP with cap
          if (result.rewards.fatePoints > 0) {
            const fpResult = applyFPWithCap(result.newState, result.rewards.fatePoints, 'tournament');
            result.newState = fpResult.newState;
            result.actualFP = fpResult.actualFP;
            result.fatePointsToAward = fpResult.actualFP;
          }
          result.rollTicketsToAward = result.rewards.rollTickets || 0;
        }
        return result;
      },
      getResponse: (result, { state }) => ({
        tier: result.tier,
        rewards: result.rewards,
        actualFP: result.actualFP,
        weekly: state.weekly
      }),
      successEvent: 'tournament_rewards_claimed'
    });
  };
}

/**
 * Create a handler for tournament checkpoint claim via WebSocket
 */
function createTournamentCheckpointClaimHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, day, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'CLAIM_FAILED',
      loadCharacters: false,
      action: async ({ state }) => {
        const result = actions.claimTournamentCheckpoint({ state, day });
        if (result.success && result.rewards) {
          // Apply FP with cap
          if (result.rewards.fatePoints > 0) {
            const fpResult = applyFPWithCap(result.newState, result.rewards.fatePoints, 'checkpoint');
            result.newState = fpResult.newState;
            result.actualFP = fpResult.actualFP;
            result.fatePointsToAward = fpResult.actualFP;
          }
          result.rollTicketsToAward = result.rewards.rollTickets || 0;
        }
        return result;
      },
      getResponse: (result, { state }) => ({
        day: result.day,
        checkpointName: result.checkpointName,
        rewards: result.rewards,
        claimedCheckpoints: state.weekly?.claimedCheckpoints
      }),
      successEvent: 'tournament_checkpoint_claimed'
    });
  };
}

// ===========================================
// TICKET & STREAK HANDLERS
// ===========================================

/**
 * Create a handler for daily streak claim via WebSocket
 */
function createDailyStreakClaimHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'CLAIM_FAILED',
      loadCharacters: false,
      action: async ({ state }) => {
        const result = actions.claimDailyStreak({ state });
        if (result.success && result.tickets > 0) {
          result.rollTicketsToAward = result.tickets;
        }
        return result;
      },
      getResponse: (result, { state }) => ({
        streakDays: result.streakDays,
        ticketsAwarded: result.tickets || 0,
        ticketGeneration: state.ticketGeneration
      }),
      successEvent: 'daily_streak_claimed'
    });
  };
}

/**
 * Create a handler for FP to tickets exchange via WebSocket
 */
function createFPExchangeHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'EXCHANGE_FAILED',
      loadCharacters: false,
      action: async ({ state, user }) => {
        const result = actions.exchangeFatePointsForTickets({ state, user });
        if (result.success) {
          result.rollTicketsToAward = result.ticketsReceived;
        }
        return result;
      },
      getResponse: (result, { state }) => ({
        ticketsReceived: result.ticketsReceived,
        fatePointsSpent: result.fatePointsSpent,
        ticketGeneration: state.ticketGeneration
      }),
      successEvent: 'tickets_exchanged'
    });
  };
}

// ===========================================
// BOSS HANDLERS
// ===========================================

/**
 * Create a handler for boss spawn via WebSocket
 */
function createBossSpawnHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'SPAWN_FAILED',
      loadCharacters: false,
      action: async ({ state }) => {
        return actions.spawnBoss({ state });
      },
      getResponse: (result, { state }) => ({
        boss: result.boss,
        currentHealth: state.bossEncounter?.currentHealth,
        maxHealth: state.bossEncounter?.maxHealth,
        expiresAt: state.bossEncounter?.expiresAt,
        timeLimit: state.bossEncounter?.timeLimit
      }),
      successEvent: 'boss_spawned'
    });
  };
}

/**
 * Create a handler for boss attack via WebSocket
 */
function createBossAttackHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, damage, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'ATTACK_FAILED',
      action: async ({ state, characters }) => {
        const result = actions.attackBoss({ state, damage, characters });
        if (result.success && result.defeated && result.reward) {
          result.fatePointsToAward = result.reward.fatePoints || 0;
          result.rollTicketsToAward = result.reward.rollTickets || 0;
        }
        return result;
      },
      getResponse: (result, { state }) => {
        if (result.defeated) {
          return {
            damage: result.damage,
            defeated: true,
            rewards: result.reward,
            essence: state.essence,
            lifetimeEssence: state.lifetimeEssence,
            bossEncounter: state.bossEncounter
          };
        }
        return {
          damage: result.damage,
          bossHealth: result.currentHealth,
          timeRemaining: result.timeRemaining
        };
      },
      successEvent: result => result.defeated ? 'boss_defeated' : 'boss_damage_dealt'
    });
  };
}

/**
 * Create a handler for boss status check via WebSocket
 */
function createBossStatusHandler(broadcastToUser) {
  return async ({ userId, socket, namespace, clientSeq }) => {
    return executeAction({
      userId,
      socket,
      namespace,
      clientSeq,
      broadcastToUser,
      errorCode: 'STATUS_FAILED',
      loadCharacters: false,
      applyPassive: false,
      action: async ({ state }) => {
        const bossInfo = actions.getBossInfo(state);
        return {
          success: true,
          newState: state,
          ...bossInfo
        };
      },
      getResponse: (result) => ({
        active: result.active,
        boss: result.boss,
        currentHealth: result.currentHealth,
        maxHealth: result.maxHealth,
        expiresAt: result.expiresAt,
        canSpawn: result.canSpawn
      }),
      successEvent: 'boss_status'
    });
  };
}

// ===========================================
// BURNING HOUR HANDLER
// ===========================================

/**
 * Create a handler for burning hour status via WebSocket
 */
function createBurningHourStatusHandler() {
  return async ({ socket }) => {
    const status = actions.getBurningHourStatus();
    socket.emit('burning_hour_status', status);
    return { success: true, ...status };
  };
}

module.exports = {
  executeAction,
  // Purchase handlers
  createGeneratorPurchaseHandler,
  createUpgradePurchaseHandler,
  createPrestigeUpgradePurchaseHandler,
  // Prestige
  createPrestigeHandler,
  // Gamble & Infusion
  createGambleHandler,
  createInfusionHandler,
  // Ability
  createAbilityHandler,
  // Character
  createCharacterAssignHandler,
  createCharacterUnassignHandler,
  createCharacterSwapHandler,
  // Milestones & Challenges
  createMilestoneClaimHandler,
  createRepeatableMilestoneClaimHandler,
  createDailyChallengeClaimHandler,
  createSessionMilestoneClaimHandler,
  // Tournament
  createTournamentRewardsClaimHandler,
  createTournamentCheckpointClaimHandler,
  // Tickets & Streak
  createDailyStreakClaimHandler,
  createFPExchangeHandler,
  // Boss
  createBossSpawnHandler,
  createBossAttackHandler,
  createBossStatusHandler,
  // Burning Hour
  createBurningHourStatusHandler
};
