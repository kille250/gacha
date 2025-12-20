const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FishInventory = sequelize.define('FishInventory', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  fishId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fishName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fishEmoji: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rarity: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['userId', 'fishId']
    }
  ]
});

module.exports = FishInventory;

