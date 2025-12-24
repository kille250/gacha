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
  },
  // Video fingerprinting fields
  mediaType: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'image'
  },
  frameHashes: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('frameHashes');
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    },
    set(value) {
      if (value === null || value === undefined) {
        this.setDataValue('frameHashes', null);
      } else {
        this.setDataValue('frameHashes', JSON.stringify(value));
      }
    }
  },
  representativeDHash: {
    type: DataTypes.STRING(16),
    allowNull: true
  },
  representativeAHash: {
    type: DataTypes.STRING(16),
    allowNull: true
  },
  duration: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  frameCount: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

module.exports = Character;