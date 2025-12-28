// models/passwordResetHistory.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

/**
 * PasswordResetHistory Model
 *
 * Stores audit trail for all admin-initiated password resets.
 * Used for security auditing and tracking reset patterns.
 */
class PasswordResetHistory extends Model {}

PasswordResetHistory.init(
  {
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    targetUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    ipHash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'PasswordResetHistory',
    tableName: 'PasswordResetHistory',
    timestamps: true
  }
);

module.exports = PasswordResetHistory;
