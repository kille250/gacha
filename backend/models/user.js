// models/user.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

class User extends Model {
  validPassword(password) {
    if (!this.password) return false; // Google SSO users have no password
    return bcrypt.compareSync(password, this.password);
  }
}

User.init(
  {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    googleEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      // Not unique - just for display, the googleId is the unique identifier
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true, // Allow null for Google SSO users
      set(value) {
        if (value) {
          const hash = bcrypt.hashSync(value, 10);
          this.setDataValue('password', hash);
        }
      },
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 1000,
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastDailyReward: {
      type: DataTypes.DATE,
      allowNull: true
    },
    allowR18: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    showR18: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    autofishEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    autofishUnlockedByRank: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Dedicated autofish cooldown tracking (prevents multi-instance exploits)
    lastAutofish: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    // Gacha tickets from fishing
    rollTickets: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    premiumTickets: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Track if user has used their one-time username change
    usernameChanged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Dojo (idle game) fields
    dojoSlots: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('dojoSlots');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('dojoSlots', JSON.stringify(value || []));
      }
    },
    dojoLastClaim: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dojoUpgrades: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{"slots":3,"capHours":8,"intensity":0,"masteries":{}}',
      get() {
        const value = this.getDataValue('dojoUpgrades');
        return value ? JSON.parse(value) : { slots: 3, capHours: 8, intensity: 0, masteries: {} };
      },
      set(value) {
        this.setDataValue('dojoUpgrades', JSON.stringify(value || { slots: 3, capHours: 8, intensity: 0, masteries: {} }));
      }
    },
    // Daily stats tracking for cap enforcement
    dojoDailyStats: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{}',
      get() {
        const value = this.getDataValue('dojoDailyStats');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('dojoDailyStats', JSON.stringify(value || {}));
      }
    },
    // Ticket pity system - accumulated progress towards guaranteed tickets
    dojoTicketProgress: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{"roll":0,"premium":0}',
      get() {
        const value = this.getDataValue('dojoTicketProgress');
        return value ? JSON.parse(value) : { roll: 0, premium: 0 };
      },
      set(value) {
        this.setDataValue('dojoTicketProgress', JSON.stringify(value || { roll: 0, premium: 0 }));
      }
    },
    // Fishing pity system - bad luck protection
    fishingPity: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{"legendary":0,"epic":0,"lastCast":null}',
      get() {
        const value = this.getDataValue('fishingPity');
        return value ? JSON.parse(value) : { legendary: 0, epic: 0, lastCast: null };
      },
      set(value) {
        this.setDataValue('fishingPity', JSON.stringify(value || { legendary: 0, epic: 0, lastCast: null }));
      }
    },
    // Fishing statistics
    fishingStats: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{"totalCasts":0,"totalCatches":0,"perfectCatches":0,"fishCaught":{}}',
      get() {
        const value = this.getDataValue('fishingStats');
        return value ? JSON.parse(value) : { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} };
      },
      set(value) {
        this.setDataValue('fishingStats', JSON.stringify(value || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} }));
      }
    },
    // Daily fishing limits and stats (resets daily)
    fishingDaily: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{"date":null,"manualCasts":0,"autofishCasts":0,"catches":0,"perfectCatches":0,"rareCatches":0,"tradesCompleted":0,"pointsFromTrades":0,"ticketsEarned":{"roll":0,"premium":0}}',
      get() {
        const value = this.getDataValue('fishingDaily');
        return value ? JSON.parse(value) : {
          date: null, manualCasts: 0, autofishCasts: 0, catches: 0,
          perfectCatches: 0, rareCatches: 0, tradesCompleted: 0,
          pointsFromTrades: 0, ticketsEarned: { roll: 0, premium: 0 }
        };
      },
      set(value) {
        this.setDataValue('fishingDaily', JSON.stringify(value || {}));
      }
    },
    // Daily challenges tracking
    fishingChallenges: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{"date":null,"active":[],"completed":[],"progress":{}}',
      get() {
        const value = this.getDataValue('fishingChallenges');
        return value ? JSON.parse(value) : { date: null, active: [], completed: [], progress: {} };
      },
      set(value) {
        this.setDataValue('fishingChallenges', JSON.stringify(value || {}));
      }
    },
    // Unlocked fishing areas
    fishingAreas: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{"unlocked":["pond"],"current":"pond"}',
      get() {
        const value = this.getDataValue('fishingAreas');
        return value ? JSON.parse(value) : { unlocked: ['pond'], current: 'pond' };
      },
      set(value) {
        this.setDataValue('fishingAreas', JSON.stringify(value || { unlocked: ['pond'], current: 'pond' }));
      }
    },
    // Current fishing rod
    fishingRod: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'basic'
    },
    // Owned fishing rods (tracks all purchased rods)
    fishingOwnedRods: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '["basic"]',
      get() {
        const value = this.getDataValue('fishingOwnedRods');
        return value ? JSON.parse(value) : ['basic'];
      },
      set(value) {
        this.setDataValue('fishingOwnedRods', JSON.stringify(value || ['basic']));
      }
    },
    // Lifetime achievements
    fishingAchievements: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{"totalLegendaries":0,"totalPerfects":0,"longestStreak":0,"currentStreak":0,"challengesCompleted":0,"prestige":0}',
      get() {
        const value = this.getDataValue('fishingAchievements');
        return value ? JSON.parse(value) : {
          totalLegendaries: 0, totalPerfects: 0, longestStreak: 0,
          currentStreak: 0, challengesCompleted: 0, prestige: 0
        };
      },
      set(value) {
        this.setDataValue('fishingAchievements', JSON.stringify(value || {}));
      }
    },
    
    // ===========================================
    // SECURITY & ABUSE PREVENTION FIELDS
    // ===========================================
    
    // Restriction type: none, warning, rate_limited, shadowban, temp_ban, perm_ban
    restrictionType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'none'
    },
    
    // When restriction expires (for temp_ban, rate_limited)
    restrictedUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Human-readable reason for restriction
    restrictionReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // Risk score (0-100, higher = more suspicious)
    riskScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    
    // Number of warnings received
    warningCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    
    // Device fingerprints seen for this user (JSON array)
    deviceFingerprints: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('deviceFingerprints');
        try {
          return value ? JSON.parse(value) : [];
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue('deviceFingerprints', JSON.stringify(value || []));
      }
    },
    
    // IDs of accounts suspected to be linked (JSON array)
    linkedAccounts: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('linkedAccounts');
        try {
          return value ? JSON.parse(value) : [];
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue('linkedAccounts', JSON.stringify(value || []));
      }
    },
    
    // Last known IP (hashed for privacy)
    lastKnownIP: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // When restriction was last changed (for audit)
    lastRestrictionChange: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Session invalidation timestamp - JWTs issued before this are rejected
    sessionInvalidatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Username change history (JSON array of {oldUsername, changedAt})
    usernameHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('usernameHistory');
        try {
          return value ? JSON.parse(value) : [];
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue('usernameHistory', JSON.stringify(value || []));
      }
    },
    
    // Risk score history (JSON array of {score, timestamp, reason})
    // Stores last 10 risk score changes for trend analysis
    riskScoreHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('riskScoreHistory');
        try {
          return value ? JSON.parse(value) : [];
        } catch {
          return [];
        }
      },
      set(value) {
        // Keep only the last 10 entries
        const arr = Array.isArray(value) ? value.slice(-10) : [];
        this.setDataValue('riskScoreHistory', JSON.stringify(arr));
      }
    },

    // ===========================================
    // GAME ENHANCEMENT FIELDS
    // ===========================================

    // Account level for facility tier unlocks
    accountLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },

    // Account XP for level progression
    accountXP: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },

    // Total dojo claims counter (for XP calculation)
    dojoClaimsTotal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },

    // Dojo facility tiers unlocked (JSON array)
    dojoFacilityTiers: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '["basic"]',
      get() {
        const value = this.getDataValue('dojoFacilityTiers');
        try {
          return value ? JSON.parse(value) : ['basic'];
        } catch {
          return ['basic'];
        }
      },
      set(value) {
        this.setDataValue('dojoFacilityTiers', JSON.stringify(value || ['basic']));
      }
    },

    // Gacha pity tracking (JSON object)
    gachaPity: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{"pullsSinceRare":0,"pullsSinceEpic":0,"pullsSinceLegendary":0,"totalPulls":0}',
      get() {
        const value = this.getDataValue('gachaPity');
        try {
          return value ? JSON.parse(value) : {
            pullsSinceRare: 0,
            pullsSinceEpic: 0,
            pullsSinceLegendary: 0,
            totalPulls: 0
          };
        } catch {
          return { pullsSinceRare: 0, pullsSinceEpic: 0, pullsSinceLegendary: 0, totalPulls: 0 };
        }
      },
      set(value) {
        this.setDataValue('gachaPity', JSON.stringify(value || {}));
      }
    },

    // Banner-specific pity (JSON object: {bannerId: pityData})
    bannerPity: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{}',
      get() {
        const value = this.getDataValue('bannerPity');
        try {
          return value ? JSON.parse(value) : {};
        } catch {
          return {};
        }
      },
      set(value) {
        this.setDataValue('bannerPity', JSON.stringify(value || {}));
      }
    },

    // Pull history for milestones (JSON object: {bannerId: {total, claimed[]}})
    pullHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{}',
      get() {
        const value = this.getDataValue('pullHistory');
        try {
          return value ? JSON.parse(value) : {};
        } catch {
          return {};
        }
      },
      set(value) {
        this.setDataValue('pullHistory', JSON.stringify(value || {}));
      }
    },

    // Fate points per banner (JSON object: {bannerId: {points, lastUpdate}})
    fatePoints: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{}',
      get() {
        const value = this.getDataValue('fatePoints');
        try {
          return value ? JSON.parse(value) : {};
        } catch {
          return {};
        }
      },
      set(value) {
        this.setDataValue('fatePoints', JSON.stringify(value || {}));
      }
    },

    // Weekly fate points tracking (JSON object: {weekStart, pointsEarned})
    fatePointsWeekly: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{}',
      get() {
        const value = this.getDataValue('fatePointsWeekly');
        try {
          return value ? JSON.parse(value) : {};
        } catch {
          return {};
        }
      },
      set(value) {
        this.setDataValue('fatePointsWeekly', JSON.stringify(value || {}));
      }
    },

    // Fate points transaction history (JSON array, last 50 transactions)
    fatePointsHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('fatePointsHistory');
        try {
          return value ? JSON.parse(value) : [];
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue('fatePointsHistory', JSON.stringify(value || []));
      }
    },

    // Character selectors earned (JSON array)
    characterSelectors: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('characterSelectors');
        try {
          return value ? JSON.parse(value) : [];
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue('characterSelectors', JSON.stringify(value || []));
      }
    },

    // Character mastery progress (JSON object: {characterId: masteryData})
    characterMastery: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{}',
      get() {
        const value = this.getDataValue('characterMastery');
        try {
          return value ? JSON.parse(value) : {};
        } catch {
          return {};
        }
      },
      set(value) {
        this.setDataValue('characterMastery', JSON.stringify(value || {}));
      }
    },

    // Fish codex (collection tracking)
    fishCodex: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{"discovered":[],"biomeProgress":{},"claimedMilestones":[],"recentDiscoveries":[]}',
      get() {
        const value = this.getDataValue('fishCodex');
        try {
          return value ? JSON.parse(value) : {
            discovered: [],
            biomeProgress: {},
            claimedMilestones: [],
            recentDiscoveries: []
          };
        } catch {
          return { discovered: [], biomeProgress: {}, claimedMilestones: [], recentDiscoveries: [] };
        }
      },
      set(value) {
        this.setDataValue('fishCodex', JSON.stringify(value || {}));
      }
    },

    // Luck meter for anti-frustration (JSON object: {fishing, gacha, lastUpdate})
    luckMeter: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{"fishing":0,"gacha":0,"lastUpdate":null}',
      get() {
        const value = this.getDataValue('luckMeter');
        try {
          return value ? JSON.parse(value) : { fishing: 0, gacha: 0, lastUpdate: null };
        } catch {
          return { fishing: 0, gacha: 0, lastUpdate: null };
        }
      },
      set(value) {
        this.setDataValue('luckMeter', JSON.stringify(value || {}));
      }
    },

    // Last login for return bonus calculation
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Return bonus claimed timestamp
    returnBonusClaimed: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Weekly banner tickets
    weeklyBannerTickets: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },

    // Items inventory (JSON array)
    items: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('items');
        try {
          return value ? JSON.parse(value) : [];
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue('items', JSON.stringify(value || []));
      }
    },

    // Rod skins unlocked (JSON array)
    rodSkins: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('rodSkins');
        try {
          return value ? JSON.parse(value) : [];
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue('rodSkins', JSON.stringify(value || []));
      }
    },

    // Last wandering warrior visit (for dojo alternative path)
    lastWanderingWarrior: {
      type: DataTypes.DATE,
      allowNull: true
    },
  },
  {
    sequelize,
    modelName: 'User',
  }
);

module.exports = User;