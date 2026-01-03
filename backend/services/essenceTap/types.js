/**
 * Essence Tap Type Definitions
 *
 * JSDoc type definitions for the Essence Tap minigame.
 * These provide IDE support and documentation without requiring TypeScript.
 */

// ===========================================
// GAME STATE TYPES
// ===========================================

/**
 * @typedef {Object} EssenceState
 * @property {number} essence - Current essence amount
 * @property {number} lifetimeEssence - Total essence earned all-time
 * @property {number} totalClicks - Total number of clicks
 * @property {number} totalCrits - Total critical hits
 * @property {number} prestigeLevel - Current prestige/awakening level
 * @property {number} prestigeShards - Current prestige shards
 * @property {number} clickPower - Base click power
 * @property {number} productionPerSecond - Passive production rate
 * @property {Object<string, number>} generators - Generator counts by ID
 * @property {string[]} purchasedUpgrades - IDs of purchased upgrades
 * @property {Object<string, number>} prestigeUpgrades - Prestige upgrade levels by ID
 * @property {number[]} assignedCharacters - Character IDs assigned to slots
 * @property {DailyStats} daily - Daily statistics
 * @property {WeeklyProgress} weekly - Weekly tournament progress
 * @property {SessionStats} [sessionStats] - Current session statistics
 * @property {BossEncounter} [bossEncounter] - Active boss encounter
 * @property {TicketGeneration} [ticketGeneration] - Ticket generation state
 * @property {TournamentState} [tournament] - Tournament state
 * @property {Object<string, number>} [repeatableMilestones] - Repeatable milestone counts
 * @property {string[]} [claimedMilestones] - Claimed one-time milestone keys
 * @property {number} [infusionCount] - Number of infusions performed
 * @property {number} [infusionBonus] - Total infusion bonus percentage
 * @property {Object<string, number>} [essenceTypes] - Essence type breakdown
 * @property {number} lastOnlineTimestamp - Last online timestamp for offline progress
 * @property {number} [lastSaveTimestamp] - Last save timestamp
 */

/**
 * @typedef {Object} DailyStats
 * @property {string} date - Date string (YYYY-MM-DD)
 * @property {number} clicks - Clicks today
 * @property {number} crits - Critical hits today
 * @property {number} essenceEarned - Essence earned today
 * @property {string[]} [claimedChallenges] - Claimed daily challenge IDs
 * @property {number} [gambleCount] - Gambles today
 * @property {number} [gambleWins] - Gamble wins today
 */

/**
 * @typedef {Object} WeeklyProgress
 * @property {string} weekId - ISO week identifier
 * @property {number} essenceEarned - Essence earned this week
 * @property {number} [earnedFP] - Fate points earned this week
 * @property {boolean} [rewardsClaimed] - Whether weekly rewards claimed
 * @property {number[]} [claimedCheckpoints] - Claimed checkpoint days
 * @property {number} [streak] - Tournament participation streak
 */

/**
 * @typedef {Object} SessionStats
 * @property {number} sessionStartTime - Session start timestamp
 * @property {number} sessionEssence - Essence earned this session
 * @property {number} currentCombo - Current combo count
 * @property {number} maxCombo - Max combo achieved this session
 * @property {number} critStreak - Current crit streak
 * @property {number} maxCritStreak - Max crit streak this session
 * @property {string[]} [claimedSessionMilestones] - Claimed session milestones
 * @property {string[]} [claimedComboMilestones] - Claimed combo milestones
 * @property {string[]} [claimedCritMilestones] - Claimed crit milestones
 */

/**
 * @typedef {Object} BossEncounter
 * @property {boolean} active - Whether boss is currently active
 * @property {BossInfo} [boss] - Boss information
 * @property {number} [currentHealth] - Current boss health
 * @property {number} [maxHealth] - Maximum boss health
 * @property {number} [expiresAt] - Timestamp when boss expires
 * @property {number} [timeLimit] - Time limit in milliseconds
 * @property {BossReward} [pendingReward] - Pending reward if defeated
 * @property {number} [lastSpawnTime] - Last spawn timestamp
 * @property {number} [clicksSinceLastBoss] - Clicks since last boss
 */

/**
 * @typedef {Object} BossInfo
 * @property {string} id - Boss ID
 * @property {string} name - Boss display name
 * @property {string} element - Boss element type
 * @property {string} [tier] - Boss tier
 * @property {number} [healthMultiplier] - Health scaling
 */

/**
 * @typedef {Object} BossReward
 * @property {number} essence - Essence reward
 * @property {number} [fatePoints] - Fate points reward
 * @property {number} [rollTickets] - Roll tickets reward
 */

/**
 * @typedef {Object} TicketGeneration
 * @property {number} streakDays - Current daily streak
 * @property {string} [lastClaimDate] - Last claim date
 * @property {number} [exchangeCount] - FP exchanges today
 */

/**
 * @typedef {Object} TournamentState
 * @property {string} bracket - Current bracket (S, A, B, C)
 * @property {TournamentCosmetics} [cosmetics] - Cosmetics state
 */

/**
 * @typedef {Object} TournamentCosmetics
 * @property {string[]} owned - Owned cosmetic IDs
 * @property {Object<string, string>} equipped - Equipped cosmetics by slot
 */

// ===========================================
// ACTION TYPES
// ===========================================

/**
 * @typedef {Object} ActionResult
 * @property {boolean} success - Whether action succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 * @property {EssenceState} [newState] - Updated state if successful
 * @property {Object} [details] - Additional result details
 */

/**
 * @typedef {Object} PurchaseResult
 * @property {boolean} success - Whether purchase succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 * @property {EssenceState} [newState] - Updated state if successful
 * @property {number} [cost] - Cost of purchase
 * @property {number} [newCount] - New count after purchase
 * @property {Object} [item] - Purchased item info
 */

/**
 * @typedef {Object} GambleResult
 * @property {boolean} success - Whether gamble succeeded
 * @property {string} [error] - Error message if failed
 * @property {EssenceState} [newState] - Updated state
 * @property {boolean} [won] - Whether the gamble was won
 * @property {number} [betAmount] - Amount bet
 * @property {string} [betType] - Type of bet
 * @property {number} [multiplier] - Win multiplier
 * @property {number} [essenceChange] - Net essence change
 * @property {number} [newEssence] - Essence after gamble
 * @property {number} [jackpotWin] - Jackpot amount if won
 */

/**
 * @typedef {Object} PrestigeResult
 * @property {boolean} success - Whether prestige succeeded
 * @property {string} [error] - Error message if failed
 * @property {EssenceState} [newState] - Updated state
 * @property {number} [shardsEarned] - Shards earned
 * @property {number} [totalShards] - Total shards after prestige
 * @property {number} [prestigeLevel] - New prestige level
 * @property {number} [fatePointsReward] - FP reward
 * @property {number} [xpReward] - XP reward
 * @property {number} [startingEssence] - Starting essence after reset
 */

/**
 * @typedef {Object} BossAttackResult
 * @property {boolean} success - Whether attack succeeded
 * @property {string} [error] - Error message if failed
 * @property {EssenceState} [newState] - Updated state
 * @property {number} [damage] - Damage dealt
 * @property {number} [currentHealth] - Boss current health
 * @property {boolean} [defeated] - Whether boss was defeated
 * @property {BossReward} [reward] - Reward if defeated
 * @property {number} [timeRemaining] - Time remaining
 */

// ===========================================
// CHARACTER TYPES
// ===========================================

/**
 * @typedef {Object} CharacterInfo
 * @property {number} id - Character ID
 * @property {number} [characterId] - Same as id (alias)
 * @property {string} rarity - Character rarity
 * @property {string} element - Character element
 * @property {string} [series] - Character series
 * @property {string} [name] - Character name
 */

/**
 * @typedef {Object} CharacterBonuses
 * @property {number} characterBonus - Total character bonus multiplier
 * @property {Object<string, number>} elementBonuses - Bonus per element
 * @property {number} elementSynergy - Element synergy bonus
 * @property {number} seriesSynergy - Series synergy bonus
 * @property {number} masteryBonus - Mastery bonus
 */

// ===========================================
// CONFIG TYPES
// ===========================================

/**
 * @typedef {Object} GeneratorConfig
 * @property {string} id - Generator ID
 * @property {string} name - Display name
 * @property {number} baseCost - Base cost
 * @property {number} baseProduction - Base production per second
 * @property {number} [costMultiplier] - Cost scaling factor
 * @property {number} [unlockAt] - Lifetime essence to unlock
 */

/**
 * @typedef {Object} UpgradeConfig
 * @property {string} id - Upgrade ID
 * @property {string} name - Display name
 * @property {string} description - Upgrade description
 * @property {number} cost - Cost in essence
 * @property {string} type - Upgrade type (click, generator, global, synergy)
 * @property {string} [target] - Target of upgrade
 * @property {number} [multiplier] - Bonus multiplier
 * @property {string} [unlockCondition] - Unlock condition
 */

/**
 * @typedef {Object} MilestoneConfig
 * @property {string} key - Milestone key
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} requirement - Required value
 * @property {string} type - Milestone type
 * @property {number} fatePoints - FP reward
 */

// ===========================================
// MIDDLEWARE TYPES
// ===========================================

/**
 * @typedef {Object} GameStateContext
 * @property {Object} gameUser - The user model instance
 * @property {EssenceState} gameState - Current game state
 * @property {CharacterInfo[]} [characters] - User's characters
 * @property {boolean} [gameStateChanged] - Whether state was modified
 */

/**
 * @typedef {Object} FPAwardResult
 * @property {EssenceState} newState - Updated state
 * @property {number} actualFP - Actual FP awarded (after cap)
 * @property {boolean} capped - Whether cap was applied
 * @property {Object} fatePoints - Updated user fate points
 */

/**
 * @typedef {Object} RewardResult
 * @property {EssenceState} newState - Updated state
 * @property {Object} awarded - Amounts actually awarded
 * @property {Object} [capped] - Cap information if any
 */

// ===========================================
// WEBSOCKET TYPES
// ===========================================

/**
 * @typedef {Object} WSActionOptions
 * @property {number} userId - User ID
 * @property {Object} socket - Socket instance
 * @property {Object} namespace - Socket namespace
 * @property {number} [clientSeq] - Client sequence number
 * @property {Function} action - Action function
 * @property {Function} [getResponse] - Response builder function
 * @property {string} successEvent - Success event name
 * @property {string} [errorCode] - Error code for failures
 * @property {boolean} [loadCharacters] - Whether to load characters
 * @property {boolean} [applyPassive] - Whether to apply passive gains
 * @property {Function} [broadcastToUser] - Broadcast function
 */

/**
 * @typedef {Object} WSActionContext
 * @property {EssenceState} state - Current game state
 * @property {CharacterInfo[]} characters - User's characters
 * @property {Object} user - User model instance
 * @property {Object} transaction - Database transaction
 */

// Export for module consumption
module.exports = {
  // This file is primarily for JSDoc type definitions
  // No runtime exports needed, but we export an empty object
  // so the file can be required without error
};
