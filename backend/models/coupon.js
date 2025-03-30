const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('coins', 'character', 'item'),
    defaultValue: 'coins',
  },
  value: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  characterId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  maxUses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  usesPerUser: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  currentUses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

module.exports = Coupon;