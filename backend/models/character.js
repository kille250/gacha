const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Character = sequelize.define('Character', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false
  },
  series: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rarity: {
    type: DataTypes.STRING,
    defaultValue: 'common'
  },
  isR18: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Image fingerprinting fields for duplicate detection
  sha256Hash: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  dHash: {
    type: DataTypes.STRING(16),
    allowNull: true
  },
  aHash: {
    type: DataTypes.STRING(16),
    allowNull: true
  },
  duplicateWarning: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = Character;