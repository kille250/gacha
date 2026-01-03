/**
 * Essence Tap Type Definitions (JSDoc)
 *
 * Comprehensive type definitions for the Essence Tap minigame.
 * Used by both backend and frontend for type safety.
 *
 * This file consolidates all type definitions previously split across multiple files.
 *
 * @module shared/types/essenceTap
 */

// ===========================================
// STATE TYPES
// ===========================================

/**
 * Core state for the Essence Tap minigame
 * @typedef {Object} EssenceTapState
 * @property {number} essence - Current essence amount
 * @property {number} lifetimeEssence - Total essence earned across all time
 * @property {number} totalClicks - Total number of clicks/taps
 * @property {number} totalCrits - Total critical hits
 * @property {Object.<string, number>} generators - Generators owned { generatorId: count }
 * @property {string[]} purchasedUpgrades - Array of purchased upgrade IDs
 * @property {number} clickPower - Base click power
 * @property {number} productionPerSecond - Passive production rate
 * @property {number} critChance - Critical hit chance (0-1)
 * @property {number} critMultiplier - Critical hit multiplier
 * @property {number} prestigeLevel - Current prestige level
 * @property {number} prestigeShards - Current prestige shards
 * @property {number} lifetimeShards - Total shards earned across all prestiges
 * @property {Object.<string, number>} prestigeUpgrades - Prestige upgrades { upgradeId: level }
 * @property {PrestigeState} [prestige] - Prestige system state (detailed)
 * @property {string[]} assignedCharacters - Array of assigned character IDs
 * @property {DailyProgress} daily - Daily progress tracking
 * @property {string[]} claimedMilestones - Array of claimed milestone keys
 * @property {RepeatableMilestones} repeatableMilestones - Repeatable milestone tracking
 * @property {Object.<string, number>} [repeatableMilestonesCounts] - Alternative repeatable milestone counts
 * @property {EssenceTapStats} stats - Lifetime statistics
 * @property {number} infusionCount - Number of infusions this prestige
 * @property {number} infusionBonus - Current infusion bonus multiplier
 * @property {InfusionState} [infusion] - Infusion system state (detailed)
 * @property {Object.<string, number>} abilityCooldowns - Ability cooldowns { abilityId: timestamp }
 * @property {AbilityState} [abilities] - Active abilities state (detailed)
 * @property {Object.<string, number>} characterXP - Character XP earned { charId: xp }
 * @property {Object.<string, CharacterMasteryData>} characterMastery - Character mastery tracking
 * @property {CharacterBonuses} [characterBonus] - Character bonus values
 * @property {WeeklyTournament} weekly - Weekly tournament tracking
 * @property {TournamentState} [tournament] - Tournament metadata
 * @property {number} jackpotContributions - Progressive jackpot contribution tracking
 * @property {TicketGeneration} ticketGeneration - Roll ticket generation tracking
 * @property {WeeklyFP} weeklyFP - Weekly FP cap tracking
 * @property {SessionStats} sessionStats - Session stats for mini-milestones
 * @property {EssenceTypes} essenceTypes - Essence types tracking
 * @property {BossEncounter} [bossEncounter] - Boss encounter state
 * @property {number} lastOnlineTimestamp - Last online timestamp
 * @property {number} lastSaveTimestamp - Last save timestamp
 * @property {number} lastGambleTimestamp - Last gamble timestamp
 * @property {number} createdAt - State creation timestamp
 */

/**
 * Daily progress tracking
 * @typedef {Object} DailyProgress
 * @property {string|null} date - Current date string (YYYY-MM-DD)
 * @property {number} clicks - Clicks today
 * @property {number} crits - Crits today
 * @property {number} essenceEarned - Essence earned today
 * @property {number} generatorsBought - Generators bought today
 * @property {string[]} completedChallenges - Completed challenge IDs
 * @property {string[]} [claimedChallenges] - Claimed challenge IDs
 * @property {number} gamblesUsed - Gambles used today
 * @property {number} ticketChallengesCompleted - Ticket challenges completed
 */

/**
 * Repeatable milestone tracking
 * @typedef {Object} RepeatableMilestones
 * @property {string|null} weeklyEssenceLastClaimed - ISO week string of last weekly claim
 * @property {number} per100BCount - Number of 100B milestones claimed
 */

/**
 * Lifetime statistics
 * @typedef {Object} EssenceTapStats
 * @property {number} totalGeneratorsBought - Total generators purchased
 * @property {number} totalUpgradesPurchased - Total upgrades purchased
 * @property {number} highestCombo - Highest combo achieved
 * @property {number} goldenEssenceClicks - Golden essence clicks
 * @property {number} totalGambleWins - Total gamble wins
 * @property {number} totalGambleLosses - Total gamble losses
 * @property {number} totalInfusions - Total infusions performed
 * @property {number} jackpotsWon - Jackpots won
 * @property {number} totalJackpotWinnings - Total jackpot winnings
 */

/**
 * Character mastery tracking data
 * @typedef {Object} CharacterMasteryData
 * @property {number} hoursUsed - Hours the character has been used
 * @property {number} level - Current mastery level
 */

/**
 * Weekly tournament tracking
 * @typedef {Object} WeeklyTournament
 * @property {string|null} weekId - ISO week string
 * @property {number} essenceEarned - Essence earned this week
 * @property {number|null} rank - Current rank
 * @property {number|null} [bracketRank] - Bracket rank
 * @property {boolean} rewardsClaimed - Whether rewards have been claimed
 * @property {number[]} [claimedCheckpoints] - Claimed checkpoint days (alternative)
 * @property {number[]} [checkpointsClaimed] - Claimed checkpoint days
 */

/**
 * Ticket generation tracking
 * @typedef {Object} TicketGeneration
 * @property {number} dailyStreakDays - Current daily streak days
 * @property {string|null} lastStreakDate - Last streak date string
 * @property {number} exchangedThisWeek - Exchanges this week
 * @property {string|null} lastExchangeWeek - Last exchange week string
 */

/**
 * Weekly FP cap tracking
 * @typedef {Object} WeeklyFP
 * @property {string|null} weekId - ISO week string
 * @property {number} earnedThisWeek - FP earned this week (alternative)
 * @property {number} [earned] - FP earned this week
 * @property {Object.<string, number>} [sources] - FP sources tracking
 */

/**
 * Session statistics for mini-milestones
 * @typedef {Object} SessionStats
 * @property {number|null} sessionStartTime - Session start timestamp
 * @property {number} sessionEssence - Essence earned this session
 * @property {number} [essence] - Alternative essence field
 * @property {number} [clicks] - Session clicks
 * @property {number} currentCombo - Current combo count
 * @property {number} maxCombo - Max combo this session
 * @property {number} critStreak - Current crit streak
 * @property {number} maxCritStreak - Max crit streak this session
 * @property {string[]} claimedSessionMilestones - Claimed session milestones
 * @property {string[]} claimedComboMilestones - Claimed combo milestones
 * @property {string[]} claimedCritMilestones - Claimed crit milestones
 */

/**
 * Essence types tracking
 * @typedef {Object} EssenceTypes
 * @property {number} pure - Pure essence earned
 * @property {number} ambient - Ambient essence earned
 * @property {number} golden - Golden essence earned
 * @property {number} prismatic - Prismatic essence earned
 */

/**
 * Boss encounter state
 * @typedef {Object} BossEncounter
 * @property {string|null} currentBossId - Current boss ID
 * @property {BossInstance} [currentBoss] - Current active boss (detailed)
 * @property {number} currentHealth - Current boss health
 * @property {number} maxHealth - Max boss health
 * @property {number} expiresAt - Boss expiration timestamp
 * @property {number} clicksSinceLastBoss - Clicks since last boss
 * @property {number} lastBossDefeatedAt - Last boss defeat timestamp
 * @property {number} [lastBossSpawnTime] - Last boss spawn timestamp
 * @property {number} bossesDefeated - Total bosses defeated
 * @property {number} [totalDefeated] - Total bosses defeated (alternative)
 * @property {string[]} [defeatedBosses] - Defeated boss IDs
 */

/**
 * Boss instance details
 * @typedef {Object} BossInstance
 * @property {string} id - Boss ID
 * @property {string} name - Boss name
 * @property {number} maxHealth - Maximum health
 * @property {number} currentHealth - Current health
 * @property {number} spawnTime - Spawn timestamp
 * @property {number} timeLimit - Time limit in ms
 */

/**
 * Prestige system state
 * @typedef {Object} PrestigeState
 * @property {number} level - Current prestige level
 * @property {number} totalPrestiges - Total number of prestiges
 * @property {number} lastPrestigeTimestamp - Last prestige timestamp
 * @property {number} lifetimeShards - Total shards ever earned
 */

/**
 * Active abilities state
 * @typedef {Object} AbilityState
 * @property {Object.<string, ActiveAbility>} active - Currently active abilities
 * @property {Object.<string, number>} cooldowns - Ability cooldown end timestamps
 */

/**
 * Active ability details
 * @typedef {Object} ActiveAbility
 * @property {string} id - Ability ID
 * @property {number} startTime - Activation timestamp
 * @property {number} endTime - Expiration timestamp
 * @property {number} multiplier - Effect multiplier
 */

/**
 * Tournament metadata tracking
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
 * Tournament cosmetics
 * @typedef {Object} TournamentCosmetics
 * @property {string[]} owned - Owned cosmetic IDs
 * @property {Object.<string, string>} equipped - Equipped cosmetics by slot
 */

/**
 * Character bonus values
 * @typedef {Object} CharacterBonuses
 * @property {number} clickPower - Click power bonus
 * @property {number} production - Production bonus
 * @property {number} critChance - Crit chance bonus
 * @property {number} critMultiplier - Crit multiplier bonus
 */

/**
 * Infusion system state
 * @typedef {Object} InfusionState
 * @property {number} count - Total infusions performed
 * @property {number} totalBonus - Total bonus from infusions
 * @property {number} [lastInfusionTime] - Last infusion timestamp
 */

// ===========================================
// GENERATOR TYPES
// ===========================================

/**
 * Generator configuration
 * @typedef {Object} GeneratorConfig
 * @property {string} id - Generator unique ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} baseCost - Base purchase cost
 * @property {number} costMultiplier - Cost multiplier per purchase
 * @property {number} baseOutput - Base essence per second (alternative)
 * @property {number} [baseProduction] - Base production per second
 * @property {number} unlockEssence - Lifetime essence required to unlock (alternative)
 * @property {number} [unlockRequirement] - Essence requirement to unlock
 * @property {string} [icon] - Icon identifier
 */

/**
 * Generator UI state
 * @typedef {Object} GeneratorUIState
 * @property {string} id - Generator ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} owned - Number owned
 * @property {number} cost - Cost for next purchase
 * @property {boolean} unlocked - Whether unlocked
 * @property {boolean} canAfford - Whether can afford
 * @property {number} maxPurchasable - Max purchasable with current essence
 * @property {number} baseOutput - Base output per unit
 */

// ===========================================
// UPGRADE TYPES
// ===========================================

/**
 * Upgrade configuration
 * @typedef {Object} UpgradeConfig
 * @property {string} id - Upgrade unique ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} cost - Purchase cost
 * @property {string} [type] - Upgrade type (click, generator, global, synergy)
 * @property {string} [effect] - Effect type
 * @property {number} [multiplier] - Multiplier bonus
 * @property {number} [flatBonus] - Flat bonus amount
 * @property {number} [value] - Effect value
 * @property {string} [generatorId] - Target generator ID (for generator upgrades)
 * @property {number} [unlockEssence] - Lifetime essence required to unlock
 * @property {string} [requiresGenerator] - Generator ID requirement
 * @property {number} [requiresGeneratorCount] - Generator count requirement
 * @property {string} [requires] - Required upgrade ID
 */

/**
 * Upgrade UI state
 * @typedef {Object} UpgradeUIState
 * @property {string} id - Upgrade ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} cost - Cost
 * @property {boolean} purchased - Whether purchased
 * @property {boolean} unlocked - Whether unlocked
 * @property {boolean} canAfford - Whether can afford
 * @property {string} [type] - Upgrade type
 */

// ===========================================
// PRESTIGE TYPES
// ===========================================

/**
 * Prestige information for UI
 * @typedef {Object} PrestigeInfo
 * @property {number} prestigeLevel - Current prestige level
 * @property {number} currentShards - Current prestige shards
 * @property {number} lifetimeShards - Lifetime shards earned
 * @property {number} shardsIfPrestige - Shards gained if prestige now
 * @property {boolean} canPrestige - Whether can prestige
 * @property {number} minimumEssence - Minimum essence required to prestige
 * @property {number} currentBonus - Current prestige bonus multiplier
 * @property {number} bonusAfterPrestige - Bonus after prestige
 * @property {PrestigeUpgradeInfo[]} upgrades - Available prestige upgrades
 */

/**
 * Prestige upgrade information
 * @typedef {Object} PrestigeUpgradeInfo
 * @property {string} id - Upgrade ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} level - Current level
 * @property {number} maxLevel - Max level
 * @property {number} cost - Cost for next level
 * @property {boolean} maxed - Whether maxed
 * @property {boolean} canAfford - Whether can afford
 */

/**
 * Prestige upgrade configuration
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

// ===========================================
// CHARACTER TYPES
// ===========================================

/**
 * Character information
 * @typedef {Object} CharacterInfo
 * @property {string|number} id - Character ID
 * @property {string} [characterId] - Alternative character ID field
 * @property {string} rarity - Character rarity (common, uncommon, rare, epic, legendary)
 * @property {string} element - Character element (fire, water, earth, air, light, dark, neutral)
 * @property {string} [series] - Character series/franchise
 */

/**
 * Element bonuses
 * @typedef {Object} ElementBonuses
 * @property {number} critChance - Crit chance bonus (Fire)
 * @property {number} production - Production bonus (Water)
 * @property {number} offline - Offline bonus (Earth)
 * @property {number} comboDuration - Combo duration bonus (Air)
 * @property {number} goldenChance - Golden chance bonus (Light)
 * @property {number} clickPower - Click power bonus (Dark)
 * @property {number} allStats - All stats bonus (Neutral)
 */

/**
 * Element synergy information
 * @typedef {Object} ElementSynergy
 * @property {number} bonus - Total synergy bonus
 * @property {Array<{element: string, count: number, bonus: number}>} synergies - Individual synergies
 * @property {boolean} isFullTeam - Whether full team of same element
 * @property {boolean} isDiverseTeam - Whether diverse team
 */

/**
 * Series synergy information
 * @typedef {Object} SeriesSynergy
 * @property {number} bonus - Total bonus from series matches
 * @property {Array<{series: string, count: number, bonus: number}>} seriesMatches - Series matches
 * @property {number} diversityBonus - Diversity bonus
 * @property {number} totalBonus - Total combined bonus
 */

/**
 * Character mastery information
 * @typedef {Object} CharacterMasteryInfo
 * @property {number} level - Current mastery level
 * @property {number} hoursUsed - Hours used
 * @property {number} productionBonus - Production bonus from mastery
 * @property {string|null} unlockedAbility - Unlocked ability (if any)
 * @property {number|null} hoursToNextLevel - Hours until next level
 * @property {boolean} maxLevel - Whether at max level
 */

// ===========================================
// ABILITY TYPES
// ===========================================

/**
 * Ability configuration
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

// ===========================================
// BOSS TYPES
// ===========================================

/**
 * Boss configuration
 * @typedef {Object} BossConfig
 * @property {string} id - Boss ID
 * @property {string} name - Boss name
 * @property {number} baseHealth - Base health
 * @property {number} healthScaling - Health scaling per defeat
 * @property {number} timeLimit - Time limit in seconds
 * @property {BossReward} baseReward - Base rewards
 */

/**
 * Boss reward
 * @typedef {Object} BossReward
 * @property {number} essence - Essence reward
 * @property {number} [fatePoints] - Fate points reward
 * @property {number} [rollTickets] - Roll tickets reward
 */

// ===========================================
// CHALLENGE & MILESTONE TYPES
// ===========================================

/**
 * Daily challenge configuration
 * @typedef {Object} DailyChallengeConfig
 * @property {string} id - Challenge ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {string} type - Challenge type (clicks, crits, essence_earned, etc.)
 * @property {number} target - Target value
 * @property {ChallengeReward} reward - Reward for completion
 */

/**
 * Challenge reward
 * @typedef {Object} ChallengeReward
 * @property {number} [essence] - Essence reward
 * @property {number} [fatePoints] - Fate points reward
 * @property {number} [rollTickets] - Roll tickets reward
 */

/**
 * Completed challenge information
 * @typedef {Object} CompletedChallenge
 * @property {string} id - Challenge ID
 * @property {string} name - Challenge name
 * @property {string} type - Challenge type
 */

/**
 * Milestone configuration
 * @typedef {Object} MilestoneConfig
 * @property {string} key - Milestone key
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {string} type - Milestone type
 * @property {number} target - Target value
 * @property {number} fatePoints - Fate points reward
 */

// ===========================================
// WEBSOCKET MESSAGE TYPES
// ===========================================

/**
 * Tap message from client
 * @typedef {Object} TapMessage
 * @property {number} count - Number of taps
 * @property {number} comboMultiplier - Current combo multiplier
 * @property {number} clientSeq - Client sequence number
 */

/**
 * Tap confirmation to client
 * @typedef {Object} TapConfirmation
 * @property {number} essenceEarned - Total essence earned
 * @property {number} essence - New essence total
 * @property {number} lifetimeEssence - New lifetime essence total
 * @property {number} critCount - Number of crits
 * @property {number} goldenCount - Number of golden clicks
 * @property {number} seq - Server sequence number
 * @property {number} confirmedClientSeq - Confirmed client sequence
 * @property {number} serverTimestamp - Server timestamp
 */

/**
 * Purchase generator message
 * @typedef {Object} PurchaseGeneratorMessage
 * @property {string} generatorId - Generator ID to purchase
 * @property {number} [count=1] - Number to purchase
 * @property {number} clientSeq - Client sequence number
 */

/**
 * Purchase upgrade message
 * @typedef {Object} PurchaseUpgradeMessage
 * @property {string} upgradeId - Upgrade ID to purchase
 * @property {number} clientSeq - Client sequence number
 */

/**
 * Assign character message
 * @typedef {Object} AssignCharacterMessage
 * @property {string|number} characterId - Character ID to assign
 * @property {number} clientSeq - Client sequence number
 */

/**
 * Action rejected message
 * @typedef {Object} ActionRejected
 * @property {number} clientSeq - Client sequence that was rejected
 * @property {string} reason - Rejection reason
 * @property {string} [code] - Error code
 */

/**
 * Game state sync message
 * @typedef {Object} GameStateSync
 * @property {EssenceTapState} state - Full game state
 * @property {number} seq - Server sequence number
 * @property {number} serverTimestamp - Server timestamp
 */

// ===========================================
// WEBSOCKET EVENT TYPES
// ===========================================

/**
 * Tap event data
 * @typedef {Object} TapEventData
 * @property {number} count - Number of taps
 * @property {number} comboMultiplier - Combo multiplier at time of tap
 * @property {number} clientSeq - Client sequence number
 */

/**
 * Tap confirmed event
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
 * State full event
 * @typedef {Object} StateFullEvent
 * @property {EssenceTapState} - Full state (spread properties)
 * @property {number} seq - Server sequence number
 * @property {number} serverTimestamp - Server timestamp
 */

/**
 * State delta event
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
 * Action rejected event
 * @typedef {Object} ActionRejectedEvent
 * @property {number} [clientSeq] - Rejected client sequence
 * @property {string} reason - Rejection reason
 * @property {string} code - Error code
 * @property {Object} [correctState] - Correct state values
 */

// ===========================================
// GAME STATE UI TYPES
// ===========================================

/**
 * Game state for UI rendering
 * @typedef {Object} GameStateUI
 * @property {number} essence - Current essence
 * @property {number} lifetimeEssence - Lifetime essence
 * @property {number} totalClicks - Total clicks
 * @property {number} totalCrits - Total crits
 * @property {number} clickPower - Calculated click power
 * @property {number} productionPerSecond - Calculated production per second
 * @property {number} critChance - Calculated crit chance (0-1)
 * @property {number} critMultiplier - Crit damage multiplier
 * @property {number} goldenChance - Golden click chance (0-1)
 * @property {number} comboDecayTime - Combo decay time in ms
 * @property {GeneratorUIState[]} generators - Generator states
 * @property {UpgradeUIState[]} upgrades - Upgrade states
 * @property {PrestigeInfo} prestige - Prestige information
 * @property {string[]} assignedCharacters - Assigned character IDs
 * @property {number} maxAssignedCharacters - Max assignable characters
 * @property {number} characterBonus - Character bonus multiplier
 * @property {ElementBonuses} elementBonuses - Element bonuses
 * @property {ElementSynergy} elementSynergy - Element synergy info
 * @property {SeriesSynergy} seriesSynergy - Series synergy info
 * @property {Object} masteryBonus - Mastery bonus info
 * @property {Object.<string, CharacterMasteryInfo>} characterMasteryInfo - Per-character mastery
 * @property {number} underdogBonus - Underdog bonus
 * @property {number} clickGeneratorScaling - Click power scaling from generators
 * @property {Object} infusion - Infusion state
 * @property {Object} dailyModifier - Current daily modifier
 * @property {EssenceTapStats} stats - Lifetime stats
 * @property {DailyProgress} daily - Daily progress
 * @property {Object} ticketGeneration - Ticket generation info
 * @property {EssenceTypes} essenceTypes - Essence types
 * @property {number} lastOnlineTimestamp - Last online timestamp
 * @property {Object.<string, number>} characterXP - Character XP
 */

// ===========================================
// SERVICE RESULT TYPES
// ===========================================

/**
 * Generic service result
 * @typedef {Object} ServiceResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 * @property {EssenceTapState} [newState] - Updated state if successful
 */

/**
 * Tap action result
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
 * Purchase result
 * @typedef {Object} PurchaseResult
 * @property {boolean} success - Whether purchase succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 * @property {EssenceTapState} [newState] - Updated state
 * @property {number} [cost] - Cost paid
 * @property {number} [newCount] - New item count (for generators)
 */

/**
 * Prestige action result
 * @typedef {Object} PrestigeResult
 * @property {boolean} success - Whether prestige succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 * @property {EssenceTapState} [newState] - Updated state
 * @property {number} [shardsEarned] - Shards earned
 * @property {number} [fatePointsEarned] - Fate points earned
 * @property {number} [newPrestigeLevel] - New prestige level
 */

/**
 * Gamble action result
 * @typedef {Object} GambleResult
 * @property {boolean} success - Whether gamble succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 * @property {EssenceTapState} [newState] - Updated state
 * @property {boolean} [won] - Whether the gamble won
 * @property {number} [payout] - Payout amount
 * @property {number} [multiplier] - Win multiplier
 * @property {boolean} [jackpot] - Whether jackpot was won
 */

/**
 * Boss attack result
 * @typedef {Object} BossAttackResult
 * @property {boolean} success - Whether attack succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 * @property {EssenceTapState} [newState] - Updated state
 * @property {number} [damage] - Damage dealt
 * @property {boolean} [defeated] - Whether boss was defeated
 * @property {BossReward} [reward] - Reward if defeated
 */

// ===========================================
// ERROR TYPES
// ===========================================

/**
 * Essence Tap error object
 * @typedef {Object} EssenceTapError
 * @property {string} code - Error code
 * @property {string} message - Human-readable message
 * @property {Object} [details] - Additional error details
 */

/**
 * Error codes used across the Essence Tap system
 * @enum {string}
 */
const ErrorCodes = {
  INSUFFICIENT_ESSENCE: 'INSUFFICIENT_ESSENCE',
  GENERATOR_LOCKED: 'GENERATOR_LOCKED',
  UPGRADE_PURCHASED: 'UPGRADE_PURCHASED',
  UPGRADE_LOCKED: 'UPGRADE_LOCKED',
  CHARACTER_NOT_OWNED: 'CHARACTER_NOT_OWNED',
  CHARACTER_ALREADY_ASSIGNED: 'CHARACTER_ALREADY_ASSIGNED',
  MAX_CHARACTERS_ASSIGNED: 'MAX_CHARACTERS_ASSIGNED',
  CANNOT_PRESTIGE: 'CANNOT_PRESTIGE',
  PRESTIGE_UPGRADE_MAXED: 'PRESTIGE_UPGRADE_MAXED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  GAMBLE_COOLDOWN: 'GAMBLE_COOLDOWN',
  INSUFFICIENT_BET: 'INSUFFICIENT_BET',
  BOSS_NOT_ACTIVE: 'BOSS_NOT_ACTIVE',
  BOSS_EXPIRED: 'BOSS_EXPIRED',
  BOSS_COOLDOWN: 'BOSS_COOLDOWN',
  CHALLENGE_NOT_COMPLETED: 'CHALLENGE_NOT_COMPLETED',
  ALREADY_CLAIMED: 'ALREADY_CLAIMED',
  MILESTONE_NOT_REACHED: 'MILESTONE_NOT_REACHED'
};

// ===========================================
// HANDLER TYPES (for createHandler/createRoute factories)
// ===========================================

/**
 * WebSocket handler options
 * @typedef {Object} HandlerOptions
 * @property {string} eventName - Output event name
 * @property {string} errorCode - Error code for failures
 * @property {function} [validate] - Validation function
 * @property {function} execute - Execution function
 * @property {boolean} [requiresLock=true] - Whether to use row lock
 * @property {boolean} [resetDaily=false] - Whether to reset daily state
 * @property {boolean} [resetWeeklyFP=false] - Whether to reset weekly FP
 * @property {boolean} [skipBroadcast=false] - Whether to skip broadcasting result
 */

/**
 * WebSocket handler context
 * @typedef {Object} HandlerContext
 * @property {Object} socket - Socket.io socket
 * @property {number} userId - User ID
 * @property {Object} user - User model instance
 * @property {EssenceTapState} state - Current essence tap state
 * @property {Object} transaction - Sequelize transaction
 * @property {number} clientSeq - Client sequence number
 */

/**
 * WebSocket handler result
 * @typedef {Object} HandlerResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 * @property {EssenceTapState} [newState] - Updated state
 * @property {Object} [data] - Additional data to broadcast
 * @property {number} [fatePointsToAward] - Fate points to award
 * @property {number} [rollTicketsToAward] - Roll tickets to award
 * @property {Object} [rejectData] - Additional data for rejection
 */

/**
 * REST route options
 * @typedef {Object} RouteOptions
 * @property {function} [validate] - Validation function
 * @property {function} execute - Execution function
 * @property {boolean} [lockUser=true] - Whether to use row lock
 * @property {boolean} [resetDaily=false] - Whether to reset daily state
 * @property {boolean} [resetWeeklyFP=false] - Whether to reset weekly FP
 */

/**
 * REST route context
 * @typedef {Object} RouteContext
 * @property {Object} user - User model instance
 * @property {EssenceTapState} state - Current essence tap state
 * @property {Object} body - Request body
 * @property {Object} [transaction] - Sequelize transaction
 */

// Export for CommonJS
module.exports = {
  ErrorCodes
};
