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
  },
  {
    sequelize,
    modelName: 'User',
  }
);

module.exports = User;