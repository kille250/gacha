/**
 * Essence Tap Type Definitions (JSDoc)
 *
 * Shared type definitions for the Essence Tap minigame.
 * Used by both backend and frontend for type safety.
 *
 * @module shared/types/essenceTap
 */

/**
 * @typedef {Object} EssenceTapState
 * @property {number} essence - Current essence amount
 * @property {number} lifetimeEssence - Total essence earned across all time
 * @property {number} totalClicks - Total number of clicks/taps
 * @property {number} totalCrits - Total critical hits
 * @property {Object.<string, number>} generators - Generators owned { generatorId: count }
 * @property {string[]} purchasedUpgrades - Array of purchased upgrade IDs
 * @property {number} prestigeLevel - Current prestige level
 * @property {number} prestigeShards - Current prestige shards
 * @property {number} lifetimeShards - Total shards earned across all prestiges
 * @property {Object.<string, number>} prestigeUpgrades - Prestige upgrades { upgradeId: level }
 * @property {string[]} assignedCharacters - Array of assigned character IDs
 * @property {DailyProgress} daily - Daily progress tracking
 * @property {string[]} claimedMilestones - Array of claimed milestone keys
 * @property {RepeatableMilestones} repeatableMilestones - Repeatable milestone tracking
 * @property {EssenceTapStats} stats - Lifetime statistics
 * @property {number} infusionCount - Number of infusions this prestige
 * @property {number} infusionBonus - Current infusion bonus multiplier
 * @property {Object.<string, number>} abilityCooldowns - Ability cooldowns { abilityId: timestamp }
 * @property {Object.<string, number>} characterXP - Character XP earned { charId: xp }
 * @property {Object.<string, CharacterMasteryData>} characterMastery - Character mastery tracking
 * @property {WeeklyTournament} weekly - Weekly tournament tracking
 * @property {number} jackpotContributions - Progressive jackpot contribution tracking
 * @property {TicketGeneration} ticketGeneration - Roll ticket generation tracking
 * @property {WeeklyFP} weeklyFP - Weekly FP cap tracking
 * @property {SessionStats} sessionStats - Session stats for mini-milestones
 * @property {EssenceTypes} essenceTypes - Essence types tracking
 * @property {number} lastOnlineTimestamp - Last online timestamp
 * @property {number} lastSaveTimestamp - Last save timestamp
 * @property {number} lastGambleTimestamp - Last gamble timestamp
 * @property {number} createdAt - State creation timestamp
 */

/**
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
 * @typedef {Object} RepeatableMilestones
 * @property {string|null} weeklyEssenceLastClaimed - ISO week string of last weekly claim
 * @property {number} per100BCount - Number of 100B milestones claimed
 */

/**
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
 * @typedef {Object} CharacterMasteryData
 * @property {number} hoursUsed - Hours the character has been used
 * @property {number} level - Current mastery level
 */

/**
 * @typedef {Object} WeeklyTournament
 * @property {string|null} weekId - ISO week string
 * @property {number} essenceEarned - Essence earned this week
 * @property {number|null} rank - Current rank
 * @property {boolean} rewardsClaimed - Whether rewards have been claimed
 * @property {number[]} [claimedCheckpoints] - Claimed checkpoint days
 */

/**
 * @typedef {Object} TicketGeneration
 * @property {number} dailyStreakDays - Current daily streak days
 * @property {string|null} lastStreakDate - Last streak date string
 * @property {number} exchangedThisWeek - Exchanges this week
 * @property {string|null} lastExchangeWeek - Last exchange week string
 */

/**
 * @typedef {Object} WeeklyFP
 * @property {string|null} weekId - ISO week string
 * @property {number} earnedThisWeek - FP earned this week
 */

/**
 * @typedef {Object} SessionStats
 * @property {number|null} sessionStartTime - Session start timestamp
 * @property {number} sessionEssence - Essence earned this session
 * @property {number} currentCombo - Current combo count
 * @property {number} maxCombo - Max combo this session
 * @property {number} critStreak - Current crit streak
 * @property {number} maxCritStreak - Max crit streak this session
 * @property {string[]} claimedSessionMilestones - Claimed session milestones
 * @property {string[]} claimedComboMilestones - Claimed combo milestones
 * @property {string[]} claimedCritMilestones - Claimed crit milestones
 */

/**
 * @typedef {Object} EssenceTypes
 * @property {number} pure - Pure essence earned
 * @property {number} ambient - Ambient essence earned
 * @property {number} golden - Golden essence earned
 * @property {number} prismatic - Prismatic essence earned
 */

/**
 * @typedef {Object} BossEncounter
 * @property {string|null} currentBossId - Current boss ID
 * @property {number} currentHealth - Current boss health
 * @property {number} maxHealth - Max boss health
 * @property {number} expiresAt - Boss expiration timestamp
 * @property {number} clicksSinceLastBoss - Clicks since last boss
 * @property {number} lastBossDefeatedAt - Last boss defeat timestamp
 * @property {number} bossesDefeated - Total bosses defeated
 */

// ===========================================
// GENERATOR TYPES
// ===========================================

/**
 * @typedef {Object} GeneratorConfig
 * @property {string} id - Generator unique ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} baseCost - Base purchase cost
 * @property {number} costMultiplier - Cost multiplier per purchase
 * @property {number} baseOutput - Base essence per second
 * @property {number} unlockEssence - Lifetime essence required to unlock
 * @property {string} [icon] - Icon identifier
 */

/**
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
 * @typedef {Object} UpgradeConfig
 * @property {string} id - Upgrade unique ID
 * @property {string} name - Display name
 * @property {string} description - Description
 * @property {number} cost - Purchase cost
 * @property {string} [type] - Upgrade type (click, generator, global, synergy)
 * @property {number} [multiplier] - Multiplier bonus
 * @property {number} [flatBonus] - Flat bonus amount
 * @property {string} [generatorId] - Target generator ID (for generator upgrades)
 * @property {number} [unlockEssence] - Lifetime essence required to unlock
 * @property {string} [requiresGenerator] - Generator ID requirement
 * @property {number} [requiresGeneratorCount] - Generator count requirement
 */

/**
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

// ===========================================
// CHARACTER TYPES
// ===========================================

/**
 * @typedef {Object} CharacterInfo
 * @property {string|number} id - Character ID
 * @property {string} [characterId] - Alternative character ID field
 * @property {string} rarity - Character rarity (common, uncommon, rare, epic, legendary)
 * @property {string} element - Character element (fire, water, earth, air, light, dark, neutral)
 * @property {string} [series] - Character series/franchise
 */

/**
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
 * @typedef {Object} ElementSynergy
 * @property {number} bonus - Total synergy bonus
 * @property {Array<{element: string, count: number, bonus: number}>} synergies - Individual synergies
 * @property {boolean} isFullTeam - Whether full team of same element
 * @property {boolean} isDiverseTeam - Whether diverse team
 */

/**
 * @typedef {Object} SeriesSynergy
 * @property {number} bonus - Total bonus from series matches
 * @property {Array<{series: string, count: number, bonus: number}>} seriesMatches - Series matches
 * @property {number} diversityBonus - Diversity bonus
 * @property {number} totalBonus - Total combined bonus
 */

/**
 * @typedef {Object} CharacterMasteryInfo
 * @property {number} level - Current mastery level
 * @property {number} hoursUsed - Hours used
 * @property {number} productionBonus - Production bonus from mastery
 * @property {string|null} unlockedAbility - Unlocked ability (if any)
 * @property {number|null} hoursToNextLevel - Hours until next level
 * @property {boolean} maxLevel - Whether at max level
 */

// ===========================================
// WEBSOCKET MESSAGE TYPES
// ===========================================

/**
 * @typedef {Object} TapMessage
 * @property {number} count - Number of taps
 * @property {number} comboMultiplier - Current combo multiplier
 * @property {number} clientSeq - Client sequence number
 */

/**
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
 * @typedef {Object} PurchaseGeneratorMessage
 * @property {string} generatorId - Generator ID to purchase
 * @property {number} [count=1] - Number to purchase
 * @property {number} clientSeq - Client sequence number
 */

/**
 * @typedef {Object} PurchaseUpgradeMessage
 * @property {string} upgradeId - Upgrade ID to purchase
 * @property {number} clientSeq - Client sequence number
 */

/**
 * @typedef {Object} AssignCharacterMessage
 * @property {string|number} characterId - Character ID to assign
 * @property {number} clientSeq - Client sequence number
 */

/**
 * @typedef {Object} ActionRejected
 * @property {number} clientSeq - Client sequence that was rejected
 * @property {string} reason - Rejection reason
 * @property {string} [code] - Error code
 */

/**
 * @typedef {Object} GameStateSync
 * @property {EssenceTapState} state - Full game state
 * @property {number} seq - Server sequence number
 * @property {number} serverTimestamp - Server timestamp
 */

// ===========================================
// GAME STATE TYPES
// ===========================================

/**
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
// ERROR TYPES
// ===========================================

/**
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

module.exports = {
  ErrorCodes
};
