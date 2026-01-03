/**
 * Essence Tap Type Definitions
 *
 * JSDoc type definitions for the Essence Tap minigame.
 * These provide type safety through JSDoc annotations without requiring TypeScript compilation.
 */

// ===========================================
// CORE STATE TYPES
// ===========================================

/**
 * @typedef {Object} EssenceTapState
 * @property {number} essence - Current essence amount
 * @property {number} lifetimeEssence - Total essence ever earned
 * @property {number} totalClicks - Total clicks/taps made
 * @property {Object.<string, number>} generators - Generator counts by ID
 * @property {string[]} purchasedUpgrades - Array of purchased upgrade IDs
 * @property {number} clickPower - Base click power
 * @property {number} productionPerSecond - Passive production rate
 * @property {number} critChance - Critical hit chance (0-1)
 * @property {number} critMultiplier - Critical hit multiplier
 * @property {number} lastOnlineTimestamp - Last online timestamp
 * @property {PrestigeState} [prestige] - Prestige system state
 * @property {number} [prestigeShards] - Current prestige shards
 * @property {Object.<string, number>} [prestigeUpgrades] - Prestige upgrade levels
 * @property {AbilityState} [abilities] - Active abilities state
 * @property {DailyState} [daily] - Daily progress state
 * @property {WeeklyState} [weekly] - Weekly tournament state
 * @property {TournamentState} [tournament] - Tournament metadata
 * @property {BossEncounterState} [bossEncounter] - Boss encounter state
 * @property {number[]} [assignedCharacters] - Assigned character IDs
 * @property {CharacterBonuses} [characterBonus] - Character bonus values
 * @property {EssenceStats} [stats] - Gameplay statistics
 * @property {TicketGenerationState} [ticketGeneration] - Ticket generation state
 * @property {SessionStats} [sessionStats] - Current session statistics
 * @property {string[]} [claimedMilestones] - Claimed one-time milestones
 * @property {Object.<string, number>} [repeatableMilestones] - Repeatable milestone counts
 * @property {InfusionState} [infusion] - Infusion system state
 */

/**
 * @typedef {Object} PrestigeState
 * @property {number} level - Current prestige level
 * @property {number} totalPrestiges - Total number of prestiges
 * @property {number} lastPrestigeTimestamp - Last prestige timestamp
 * @property {number} lifetimeShards - Total shards ever earned
 */

/**
 * @typedef {Object} AbilityState
 * @property {Object.<string, ActiveAbility>} active - Currently active abilities
 * @property {Object.<string, number>} cooldowns - Ability cooldown end timestamps
 */

/**
 * @typedef {Object} ActiveAbility
 * @property {string} id - Ability ID
 * @property {number} startTime - Activation timestamp
 * @property {number} endTime - Expiration timestamp
 * @property {number} multiplier - Effect multiplier
 */

/**
 * @typedef {Object} DailyState
 * @property {string} date - Current date (YYYY-MM-DD)
 * @property {number} clicks - Clicks today
 * @property {number} crits - Crits today
 * @property {number} essenceEarned - Essence earned today
 * @property {number} generatorsBought - Generators bought today
 * @property {number} gamblesUsed - Gambles used today
 * @property {string[]} completedChallenges - Completed challenge IDs
 * @property {string[]} claimedChallenges - Claimed challenge IDs
 * @property {number} ticketChallengesCompleted - Ticket challenges completed today
 */

/**
 * @typedef {Object} WeeklyState
 * @property {string} weekId - ISO week identifier
 * @property {number} essenceEarned - Essence earned this week
 * @property {number} [rank] - Tournament rank
 * @property {number} [bracketRank] - Bracket rank
 * @property {boolean} rewardsClaimed - Whether rewards have been claimed
 * @property {number[]} checkpointsClaimed - Claimed checkpoint days
 */

/**
 * @typedef {Object} TournamentState
 * @property {number} streak - Current participation streak
 * @property {string} [lastParticipationWeek] - Last week participated
 * @property {number} totalTournamentsPlayed - Total tournaments played
 * @property {number} [bestRank] - Best rank achieved
 * @property {number} podiumFinishes - Top 3 finishes
 * @property {string} [bracket] - Current bracket
 * @property {TournamentCosmetics} [cosmetics] - Unlocked cosmetics
 */

/**
 * @typedef {Object} TournamentCosmetics
 * @property {string[]} owned - Owned cosmetic IDs
 * @property {Object.<string, string>} equipped - Equipped cosmetics by slot
 */

/**
 * @typedef {Object} BossEncounterState
 * @property {BossInstance} [currentBoss] - Current active boss
 * @property {number} totalDefeated - Total bosses defeated
 * @property {number} clicksSinceLastBoss - Clicks since last boss spawn
 * @property {number} [lastBossSpawnTime] - Last boss spawn timestamp
 * @property {string[]} defeatedBosses - Defeated boss IDs
 */

/**
 * @typedef {Object} BossInstance
 * @property {string} id - Boss ID
 * @property {string} name - Boss name
 * @property {number} maxHealth - Maximum health
 * @property {number} currentHealth - Current health
 * @property {number} spawnTime - Spawn timestamp
 * @property {number} timeLimit - Time limit in ms
 */

/**
 * @typedef {Object} CharacterBonuses
 * @property {number} clickPower - Click power bonus
 * @property {number} production - Production bonus
 * @property {number} critChance - Crit chance bonus
 * @property {number} critMultiplier - Crit multiplier bonus
 */

/**
 * @typedef {Object} EssenceStats
 * @property {number} [goldenEssenceClicks] - Golden essence clicks
 * @property {number} [jackpotsWon] - Jackpots won
 * @property {number} [totalJackpotWinnings] - Total jackpot winnings
 * @property {number} [totalGambleWins] - Total gamble wins
 * @property {number} [totalGambleLosses] - Total gamble losses
 */

/**
 * @typedef {Object} TicketGenerationState
 * @property {number} dailyStreakDays - Current daily streak
 * @property {string} [lastStreakDate] - Last streak claim date
 * @property {number} exchangedThisWeek - FP exchanges this week
 * @property {string} [lastExchangeWeek] - Last exchange week ID
 */

/**
 * @typedef {Object} SessionStats
 * @property {number} clicks - Session clicks
 * @property {number} essence - Session essence earned
 * @property {number} maxCombo - Max combo this session
 * @property {number} critStreak - Current crit streak
 * @property {number} maxCritStreak - Max crit streak this session
 * @property {string[]} [claimedSessionMilestones] - Claimed session milestones
 * @property {string[]} [claimedComboMilestones] - Claimed combo milestones
 * @property {string[]} [claimedCritMilestones] - Claimed crit milestones
 */

/**
 * @typedef {Object} InfusionState
 * @property {number} count - Total infusions performed
 * @property {number} totalBonus - Total bonus from infusions
 * @property {number} [lastInfusionTime] - Last infusion timestamp
 */

// ===========================================
// ACTION RESULT TYPES
// ===========================================

/**
 * @typedef {Object} ServiceResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} [error] - Error message if failed
 * @property {EssenceTapState} [newState] - Updated state if successful
 */

/**
 * @typedef {Object} TapResult
 * @property {boolean} success - Whether the tap succeeded
 * @property {EssenceTapState} newState - Updated state
 * @property {number} essenceGained - Essence gained from tap
 * @property {boolean} isCrit - Whether it was a critical hit
 * @property {boolean} isGolden - Whether it was a golden tap
 * @property {number} comboMultiplier - Applied combo multiplier
 * @property {CompletedChallenge[]} [completedChallenges] - Newly completed challenges
 */

/**
 * @typedef {Object} CompletedChallenge
 * @property {string} id - Challenge ID
 * @property {string} name - Challenge name
 * @property {string} type - Challenge type
 */

/**
 * @typedef {Object} PurchaseResult
 * @property {boolean} success - Whether purchase succeeded
 * @property {string} [error] - Error message if failed
 * @property {EssenceTapState} [newState] - Updated state
 * @property {number} [cost] - Cost paid
 * @property {number} [newCount] - New item count (for generators)
 */

/**
 * @typedef {Object} PrestigeResult
 * @property {boolean} success - Whether prestige succeeded
 * @property {string} [error] - Error message if failed
 * @property {EssenceTapState} [newState] - Updated state
 * @property {number} [shardsEarned] - Shards earned
 * @property {number} [fatePointsEarned] - Fate points earned
 * @property {number} [newPrestigeLevel] - New prestige level
 */

/**
 * @typedef {Object} GambleResult
 * @property {boolean} success - Whether gamble succeeded
 * @property {string} [error] - Error message if failed
 * @property {EssenceTapState} [newState] - Updated state
 * @property {boolean} [won] - Whether the gamble won
 * @property {number} [payout] - Payout amount
 * @property {number} [multiplier] - Win multiplier
 * @property {boolean} [jackpot] - Whether jackpot was won
 */

/**
 * @typedef {Object} BossAttackResult
 * @property {boolean} success - Whether attack succeeded
 * @property {string} [error] - Error message if failed
 * @property {EssenceTapState} [newState] - Updated state
 * @property {number} [damage] - Damage dealt
 * @property {boolean} [defeated] - Whether boss was defeated
 * @property {BossReward} [reward] - Reward if defeated
 */

/**
 * @typedef {Object} BossReward
 * @property {number} essence - Essence reward
 * @property {number} [fatePoints] - Fate points reward
 * @property {number} [rollTickets] - Roll tickets reward
 */

// ===========================================
// CONFIG TYPES
// ===========================================

/**
 * @typedef {Object} GeneratorConfig
 * @property {string} id - Generator ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} baseCost - Base purchase cost
 * @property {number} costMultiplier - Cost scaling multiplier
 * @property {number} baseProduction - Base production per second
 * @property {number} [unlockRequirement] - Essence requirement to unlock
 */

/**
 * @typedef {Object} UpgradeConfig
 * @property {string} id - Upgrade ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} cost - Purchase cost
 * @property {string} effect - Effect type
 * @property {number} value - Effect value
 * @property {string} [requires] - Required upgrade ID
 * @property {number} [requiresGenerator] - Required generator count
 */

/**
 * @typedef {Object} AbilityConfig
 * @property {string} id - Ability ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} cost - Activation cost
 * @property {number} duration - Duration in ms
 * @property {number} cooldown - Cooldown in ms
 * @property {string} effect - Effect type
 * @property {number} multiplier - Effect multiplier
 */

/**
 * @typedef {Object} PrestigeUpgradeConfig
 * @property {string} id - Upgrade ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} baseCost - Base shard cost
 * @property {number} costMultiplier - Cost scaling per level
 * @property {number} maxLevel - Maximum level
 * @property {string} effect - Effect type
 * @property {number} valuePerLevel - Effect value per level
 */

/**
 * @typedef {Object} BossConfig
 * @property {string} id - Boss ID
 * @property {string} name - Boss name
 * @property {number} baseHealth - Base health
 * @property {number} healthScaling - Health scaling per defeat
 * @property {number} timeLimit - Time limit in seconds
 * @property {BossReward} baseReward - Base rewards
 */

/**
 * @typedef {Object} DailyChallengeConfig
 * @property {string} id - Challenge ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {string} type - Challenge type (clicks, crits, essence_earned, etc.)
 * @property {number} target - Target value
 * @property {ChallengeReward} reward - Reward for completion
 */

/**
 * @typedef {Object} ChallengeReward
 * @property {number} [essence] - Essence reward
 * @property {number} [fatePoints] - Fate points reward
 * @property {number} [rollTickets] - Roll tickets reward
 */

/**
 * @typedef {Object} MilestoneConfig
 * @property {string} key - Milestone key
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {string} type - Milestone type
 * @property {number} target - Target value
 * @property {number} fatePoints - Fate points reward
 */

// ===========================================
// WEBSOCKET EVENT TYPES
// ===========================================

/**
 * @typedef {Object} TapEventData
 * @property {number} count - Number of taps
 * @property {number} comboMultiplier - Combo multiplier at time of tap
 * @property {number} clientSeq - Client sequence number
 */

/**
 * @typedef {Object} TapConfirmedEvent
 * @property {number} essence - New essence total
 * @property {number} lifetimeEssence - New lifetime essence
 * @property {number} totalClicks - New total clicks
 * @property {number[]} confirmedClientSeqs - Confirmed client sequences
 * @property {number} seq - Server sequence number
 * @property {number} serverTimestamp - Server timestamp
 * @property {CompletedChallenge[]} [completedChallenges] - Newly completed challenges
 */

/**
 * @typedef {Object} StateFullEvent
 * @property {EssenceTapState} - Full state (spread properties)
 * @property {number} seq - Server sequence number
 * @property {number} serverTimestamp - Server timestamp
 */

/**
 * @typedef {Object} StateDeltaEvent
 * @property {number} [essence] - Updated essence
 * @property {number} [lifetimeEssence] - Updated lifetime essence
 * @property {Object.<string, number>} [generators] - Updated generators
 * @property {string[]} [purchasedUpgrades] - Updated upgrades
 * @property {number} [productionPerSecond] - Updated production
 * @property {number} [clickPower] - Updated click power
 * @property {number} confirmedClientSeq - Confirmed client sequence
 * @property {number} seq - Server sequence number
 * @property {number} serverTimestamp - Server timestamp
 */

/**
 * @typedef {Object} ActionRejectedEvent
 * @property {number} [clientSeq] - Rejected client sequence
 * @property {string} reason - Rejection reason
 * @property {string} code - Error code
 * @property {Object} [correctState] - Correct state values
 */

// ===========================================
// HANDLER TYPES
// ===========================================

/**
 * @typedef {Object} HandlerOptions
 * @property {string} eventName - Output event name
 * @property {string} errorCode - Error code for failures
 * @property {function} [validate] - Validation function
 * @property {function} execute - Execution function
 * @property {boolean} [requiresLock=true] - Whether to use row lock
 * @property {boolean} [resetDaily=false] - Whether to reset daily state
 * @property {boolean} [resetWeeklyFP=false] - Whether to reset weekly FP
 */

/**
 * @typedef {Object} HandlerContext
 * @property {Object} socket - Socket.io socket
 * @property {number} userId - User ID
 * @property {Object} user - User model instance
 * @property {EssenceTapState} state - Current essence tap state
 * @property {Object} transaction - Sequelize transaction
 * @property {number} clientSeq - Client sequence number
 */

/**
 * @typedef {Object} HandlerResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 * @property {EssenceTapState} [newState] - Updated state
 * @property {Object} [data] - Additional data to broadcast
 */

// ===========================================
// ROUTE TYPES
// ===========================================

/**
 * @typedef {Object} RouteOptions
 * @property {function} [validate] - Validation function
 * @property {function} execute - Execution function
 * @property {boolean} [lockUser=true] - Whether to use row lock
 * @property {boolean} [resetDaily=false] - Whether to reset daily state
 */

/**
 * @typedef {Object} RouteContext
 * @property {Object} user - User model instance
 * @property {EssenceTapState} state - Current essence tap state
 * @property {Object} body - Request body
 * @property {Object} [transaction] - Sequelize transaction
 */

// Export for CommonJS
module.exports = {};
