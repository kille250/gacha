/**
 * SharedJackpot Model - Global progressive jackpot for Essence Tap
 *
 * This model stores a single shared jackpot that all players contribute to
 * and can win from. When won, it resets to a seed amount.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SharedJackpot = sequelize.define('SharedJackpot', {
  // Unique identifier for the jackpot type (allows for multiple jackpots in future)
  jackpotType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'essence_tap_main',
    unique: true
  },

  // Current jackpot amount
  currentAmount: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 1000000  // 1M seed
  },

  // Seed amount (minimum jackpot when reset)
  seedAmount: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 1000000
  },

  // Total contributions since last win
  totalContributions: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  },

  // Total number of wins all-time
  totalWins: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },

  // Last winner info
  lastWinnerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },

  lastWinAmount: {
    type: DataTypes.BIGINT,
    allowNull: true
  },

  lastWinDate: {
    type: DataTypes.DATE,
    allowNull: true
  },

  // Largest jackpot ever won
  largestWin: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  },

  // Number of contributors since last win
  contributorCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'SharedJackpots',
  timestamps: true
});

module.exports = SharedJackpot;
