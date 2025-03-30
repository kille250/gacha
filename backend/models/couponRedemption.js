const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CouponRedemption = sequelize.define('CouponRedemption', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  couponId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  redeemedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
});

module.exports = CouponRedemption;