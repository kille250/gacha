/**
 * Appeal Model
 * 
 * Stores user appeals for account restrictions.
 * Allows users to contest bans and request review.
 */
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Appeal extends Model {
  /**
   * Check if user has a pending appeal for their current restriction
   * @param {number} userId - User ID
   * @param {string} restrictionType - Current restriction type
   * @returns {Promise<Appeal|null>}
   */
  static async findPendingForUser(userId, restrictionType) {
    return this.findOne({
      where: {
        userId,
        restrictionType,
        status: 'pending'
      }
    });
  }
  
  /**
   * Get all pending appeals for admin review
   * @param {Object} options - Query options
   * @returns {Promise<Appeal[]>}
   */
  static async getPendingAppeals(options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    return this.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'ASC']], // Oldest first
      limit,
      offset,
      include: [{
        model: require('./user'),
        as: 'user',
        attributes: ['id', 'username', 'email', 'restrictionType', 'restrictedUntil', 'warningCount']
      }]
    });
  }
  
  /**
   * Approve an appeal
   * @param {number} appealId - Appeal ID
   * @param {number} adminId - Admin user ID
   * @param {string} notes - Review notes
   */
  static async approve(appealId, adminId, notes = '') {
    const appeal = await this.findByPk(appealId);
    if (!appeal) throw new Error('Appeal not found');
    if (appeal.status !== 'pending') throw new Error('Appeal already reviewed');
    
    appeal.status = 'approved';
    appeal.reviewedBy = adminId;
    appeal.reviewNotes = notes;
    appeal.reviewedAt = new Date();
    await appeal.save();
    
    // Remove the restriction from the user
    const User = require('./user');
    await User.update({
      restrictionType: 'none',
      restrictedUntil: null,
      restrictionReason: null,
      lastRestrictionChange: new Date()
    }, {
      where: { id: appeal.userId }
    });
    
    return appeal;
  }
  
  /**
   * Deny an appeal
   * @param {number} appealId - Appeal ID
   * @param {number} adminId - Admin user ID
   * @param {string} notes - Review notes (required)
   */
  static async deny(appealId, adminId, notes) {
    if (!notes) throw new Error('Denial reason is required');
    
    const appeal = await this.findByPk(appealId);
    if (!appeal) throw new Error('Appeal not found');
    if (appeal.status !== 'pending') throw new Error('Appeal already reviewed');
    
    appeal.status = 'denied';
    appeal.reviewedBy = adminId;
    appeal.reviewNotes = notes;
    appeal.reviewedAt = new Date();
    await appeal.save();
    
    return appeal;
  }
}

Appeal.init({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  
  restrictionType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  appealText: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 2000] // Min 10 chars, max 2000
    }
  },
  
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'denied'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  reviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Appeal',
  tableName: 'Appeals'
});

module.exports = Appeal;

