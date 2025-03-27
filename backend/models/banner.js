const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Character = require('./character');

const Banner = sequelize.define('Banner', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  series: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  costMultiplier: {
    type: DataTypes.FLOAT,
    defaultValue: 1.5
  },
  rateMultiplier: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0 // 5x higher chance of getting banner characters
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Set up association with characters
Banner.belongsToMany(Character, { through: 'BannerCharacters' });
Character.belongsToMany(Banner, { through: 'BannerCharacters' });

module.exports = Banner;