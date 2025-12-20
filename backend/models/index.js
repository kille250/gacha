// models/index.js
const User = require('./user');
const Character = require('./character');
const Coupon = require('./coupon');
const CouponRedemption = require("./couponRedemption");
const FishInventory = require('./fishInventory');

// Set up associations
User.belongsToMany(Character, { through: 'UserCharacters' });
Character.belongsToMany(User, { through: 'UserCharacters' });

// Add association between User and CouponRedemption
User.hasMany(CouponRedemption, { foreignKey: 'userId' });
CouponRedemption.belongsTo(User, { foreignKey: 'userId' });

// Add association between Coupon and CouponRedemption
Coupon.hasMany(CouponRedemption, { foreignKey: 'couponId' });
CouponRedemption.belongsTo(Coupon, { foreignKey: 'couponId' });

// Add association between Character and Coupon (for character coupons)
Character.hasMany(Coupon, { foreignKey: 'characterId' });
Coupon.belongsTo(Character, { foreignKey: 'characterId' });

// Add association between User and FishInventory
User.hasMany(FishInventory, { foreignKey: 'userId' });
FishInventory.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  User,
  Character,
  Coupon,
  CouponRedemption,
  FishInventory
};