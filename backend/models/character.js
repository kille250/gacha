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
  }
});

module.exports = Character;