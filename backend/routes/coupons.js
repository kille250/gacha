const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const admin = require('../middleware/adminAuth');
const { Coupon, CouponRedemption, User, Character } = require('../models');

// ADMIN: Get all coupons
router.get('/admin', [auth, admin], async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      include: [
        { 
          model: Character,
          attributes: ['id', 'name', 'rarity', 'image'],
          required: false
        },
        {
          model: CouponRedemption,
          attributes: ['id', 'userId', 'redeemedAt'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.json(coupons);
  } catch (err) {
    console.error('Error fetching coupons:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN: Create a new coupon
router.post('/admin', [auth, admin], async (req, res) => {
  try {
    const {
      code,
      description,
      type,
      value,
      characterId,
      maxUses,
      usesPerUser,
      startDate,
      endDate,
      isActive
    } = req.body;

    // Validate code (no spaces, alphanumeric with hyphens allowed)
    if (!code || !/^[a-zA-Z0-9\-]+$/.test(code)) {
      return res.status(400).json({ 
        error: 'Invalid code format. Use only letters, numbers, and hyphens.' 
      });
    }

    // Check if code already exists
    const existingCoupon = await Coupon.findOne({ where: { code } });
    if (existingCoupon) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }

    // Validate if characterId exists for character type coupons
    if (type === 'character' && characterId) {
      const character = await Character.findByPk(characterId);
      if (!character) {
        return res.status(400).json({ error: 'Selected character not found' });
      }
    }

    // Create the coupon
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      type,
      value,
      characterId: type === 'character' ? characterId : null,
      maxUses: maxUses || -1, // -1 means unlimited
      usesPerUser: usesPerUser || 1,
      startDate: startDate || null,
      endDate: endDate || null,
      isActive: isActive !== false
    });

    return res.status(201).json(coupon);
  } catch (err) {
    console.error('Error creating coupon:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN: Update a coupon
router.put('/admin/:id', [auth, admin], async (req, res) => {
  try {
    const couponId = req.params.id;
    const {
      code,
      description,
      type,
      value,
      characterId,
      maxUses,
      usesPerUser,
      startDate,
      endDate,
      isActive
    } = req.body;

    const coupon = await Coupon.findByPk(couponId);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // If code is being changed, check for duplicates
    if (code && code !== coupon.code) {
      if (!/^[a-zA-Z0-9\-]+$/.test(code)) {
        return res.status(400).json({ 
          error: 'Invalid code format. Use only letters, numbers, and hyphens.' 
        });
      }

      const existingCoupon = await Coupon.findOne({ 
        where: { 
          code,
          id: { [Op.ne]: couponId }
        } 
      });
      
      if (existingCoupon) {
        return res.status(400).json({ error: 'Coupon code already exists' });
      }
    }

    // Update the coupon
    await coupon.update({
      code: code ? code.toUpperCase() : coupon.code,
      description: description !== undefined ? description : coupon.description,
      type: type || coupon.type,
      value: value !== undefined ? value : coupon.value,
      characterId: type === 'character' ? characterId : null,
      maxUses: maxUses !== undefined ? maxUses : coupon.maxUses,
      usesPerUser: usesPerUser !== undefined ? usesPerUser : coupon.usesPerUser,
      startDate: startDate !== undefined ? startDate : coupon.startDate,
      endDate: endDate !== undefined ? endDate : coupon.endDate,
      isActive: isActive !== undefined ? isActive : coupon.isActive
    });

    return res.json(coupon);
  } catch (err) {
    console.error('Error updating coupon:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN: Delete a coupon
router.delete('/admin/:id', [auth, admin], async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Delete associated redemptions
    await CouponRedemption.destroy({ where: { couponId: coupon.id } });
    
    // Delete the coupon
    await coupon.destroy();
    
    return res.json({ message: 'Coupon deleted successfully' });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// USER: Redeem a coupon
router.post('/redeem', auth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'No coupon code provided' });
    }

    // Find the coupon
    const coupon = await Coupon.findOne({ 
      where: { code: code.toUpperCase() },
      include: [
        { 
          model: Character,
          attributes: ['id', 'name', 'rarity', 'image'],
          required: false
        }
      ]
    });

    // Check if coupon exists
    if (!coupon) {
      return res.status(404).json({ error: 'Invalid coupon code' });
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return res.status(400).json({ error: 'This coupon is no longer active' });
    }

    // Check date restrictions
    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return res.status(400).json({ error: 'This coupon is not yet valid' });
    }
    if (coupon.endDate && now > coupon.endDate) {
      return res.status(400).json({ error: 'This coupon has expired' });
    }

    // Check max uses
    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
      return res.status(400).json({ error: 'This coupon has reached its maximum redemption limit' });
    }

    // Check if user already redeemed this coupon
    const userRedemptions = await CouponRedemption.count({
      where: {
        userId: req.user.id,
        couponId: coupon.id
      }
    });

    if (userRedemptions >= coupon.usesPerUser) {
      return res.status(400).json({ error: 'You have already redeemed this coupon' });
    }

    // Find the user
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Process the redemption based on coupon type
    let rewardDetails = {};
    
    if (coupon.type === 'coins') {
      // Add coins to user
      user.points += coupon.value;
      await user.save();
      rewardDetails = { coins: coupon.value };
    } 
    else if (coupon.type === 'character') {
      // Add character to user's collection
      if (!coupon.characterId) {
        return res.status(400).json({ error: 'Invalid character coupon' });
      }
      
      const character = await Character.findByPk(coupon.characterId);
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      await user.addCharacter(character);
      rewardDetails = { character };
    }
    // Could add more types in the future (items, etc)

    // Record the redemption
    await CouponRedemption.create({
      userId: user.id,
      couponId: coupon.id
    });

    // Update coupon usage count
    coupon.currentUses += 1;
    await coupon.save();

    return     res.json({
      message: 'Coupon redeemed successfully',
      type: coupon.type,
      reward: rewardDetails,
      updatedPoints: user.points
    });
  } catch (err) {
    console.error('Error redeeming coupon:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;