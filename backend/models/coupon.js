const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Coupon Model
 *
 * Supports multiple reward types:
 * - coins: Awards currency points (uses 'value' field)
 * - character: Awards a specific character (uses 'characterId' field)
 * - ticket: Awards regular gacha tickets (uses 'value' field for quantity)
 * - premium_ticket: Awards premium gacha tickets (uses 'value' field for quantity)
 * - item: Reserved for future item rewards
 *
 * Ticket types use the same 'value' field as coins to specify quantity.
 * This maintains consistency with existing patterns and avoids schema changes.
 */
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
    // Extended to support ticket rewards via the existing coupon system
    // 'ticket' = regular roll tickets, 'premium_ticket' = premium tickets
    type: DataTypes.ENUM('coins', 'character', 'item', 'ticket', 'premium_ticket'),
    defaultValue: 'coins',
  },
  value: {
    // For coins: amount of currency
    // For tickets/premium_tickets: number of tickets to award
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