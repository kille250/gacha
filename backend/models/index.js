// models/index.js
const User = require('./user');
const Character = require('./character');
const Coupon = require('./coupon');
const CouponRedemption = require("./couponredemption");

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

module.exports = {
  User,
  Character,
  Coupon,
  CouponRedemption
};