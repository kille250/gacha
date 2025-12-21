// models/index.js
const User = require('./user');
const Character = require('./character');
const Banner = require('./banner');
const Coupon = require('./coupon');
const CouponRedemption = require('./couponRedemption');
const FishInventory = require('./fishInventory');
const Rarity = require('./rarity');

// ===========================================
// ASSOCIATIONS
// ===========================================

// User <-> Character (collection)
User.belongsToMany(Character, { through: 'UserCharacters' });
Character.belongsToMany(User, { through: 'UserCharacters' });

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

module.exports = {
  User,
  Character,
  Banner,
  Coupon,
  CouponRedemption,
  FishInventory,
  Rarity
};