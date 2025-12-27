const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Banner Model
 *
 * BANNER RERUN POLICY (Live-Service Guidelines):
 * ================================================
 * Banner pity progress and milestones are tracked by banner ID.
 *
 * - RERUN (Same ID): When rerunning a banner, use the SAME database record.
 *   Update startDate/endDate and reactivate. Player progress persists.
 *   Example: "Summer Festival 2024" returns as-is → progress carries over.
 *
 * - REMIX (New ID): Create a NEW banner record for significantly altered banners.
 *   Player progress starts fresh. Clearly communicate this in-game.
 *   Example: "Summer Festival 2025 Remix" with new characters → new ID.
 *
 * - STANDARD BANNER: Uses isStandard=true flag. Only one should exist.
 *   Progress is always shared. Never delete/recreate the standard banner.
 *
 * This policy ensures predictable player expectations around progress persistence.
 */
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
    defaultValue: 5.0
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isR18: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isStandard: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = Banner;