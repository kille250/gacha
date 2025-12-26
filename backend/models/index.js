// models/index.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user');
const Character = require('./character');
const Banner = require('./banner');
const Coupon = require('./coupon');
const CouponRedemption = require('./couponRedemption');
const FishInventory = require('./fishInventory');
const Rarity = require('./rarity');
const AuditEvent = require('./auditEvent');
const Appeal = require('./appeal');
const SecurityConfig = require('./securityConfig');
const ImportJob = require('./importJob');

// ===========================================
// USER CHARACTERS JUNCTION TABLE (with leveling)
// ===========================================

const UserCharacter = sequelize.define('UserCharacter', {
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  duplicateCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  // Specialization path (strength, wisdom, spirit) - permanent choice
  specialization: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null
  },
  // Mastery XP for this character
  masteryXp: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  // Training method currently assigned (standard, intense, meditation, sparring)
  trainingMethod: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'standard'
  },
  // If in intense training, when it ends
  intenseTrainingEnd: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'UserCharacters',
  timestamps: true
});

// ===========================================
// ASSOCIATIONS
// ===========================================

// User <-> Character (collection with leveling)
User.belongsToMany(Character, { through: UserCharacter });
Character.belongsToMany(User, { through: UserCharacter });

// Explicit associations on junction table for direct queries
UserCharacter.belongsTo(User, { foreignKey: 'UserId' });
UserCharacter.belongsTo(Character, { foreignKey: 'CharacterId' });
User.hasMany(UserCharacter, { foreignKey: 'UserId' });
Character.hasMany(UserCharacter, { foreignKey: 'CharacterId' });

// Banner <-> Character
Banner.belongsToMany(Character, { through: 'BannerCharacters' });
Character.belongsToMany(Banner, { through: 'BannerCharacters' });

// User <-> CouponRedemption
User.hasMany(CouponRedemption, { foreignKey: 'userId' });
CouponRedemption.belongsTo(User, { foreignKey: 'userId' });

// Coupon <-> CouponRedemption
Coupon.hasMany(CouponRedemption, { foreignKey: 'couponId' });
CouponRedemption.belongsTo(Coupon, { foreignKey: 'couponId' });

// Character <-> Coupon (for character coupons)
Character.hasMany(Coupon, { foreignKey: 'characterId' });
Coupon.belongsTo(Character, { foreignKey: 'characterId' });

// User <-> FishInventory
User.hasMany(FishInventory, { foreignKey: 'userId' });
FishInventory.belongsTo(User, { foreignKey: 'userId' });

// User <-> AuditEvent (for audit trail)
User.hasMany(AuditEvent, { foreignKey: 'userId', as: 'auditEvents' });
AuditEvent.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Appeal (for appeals system)
User.hasMany(Appeal, { foreignKey: 'userId', as: 'appeals' });
Appeal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Admin <-> Appeal (for reviewed appeals)
User.hasMany(Appeal, { foreignKey: 'reviewedBy', as: 'reviewedAppeals' });
Appeal.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

module.exports = {
  sequelize,
  User,
  Character,
  Banner,
  Coupon,
  CouponRedemption,
  FishInventory,
  Rarity,
  UserCharacter,
  AuditEvent,
  Appeal,
  SecurityConfig,
  ImportJob
};