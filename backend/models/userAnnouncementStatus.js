/**
 * UserAnnouncementStatus Model
 *
 * Tracks user interactions with announcements (views, acknowledgments, dismissals).
 * Used to determine which announcements have been seen/acknowledged by each user.
 */
const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../config/db');

class UserAnnouncementStatus extends Model {
  /**
   * Get or create status record for user/announcement pair
   * @param {number} userId - User ID
   * @param {string} announcementId - Announcement ID
   * @returns {Promise<UserAnnouncementStatus>}
   */
  static async getOrCreate(userId, announcementId) {
    const [status] = await this.findOrCreate({
      where: { userId, announcementId },
      defaults: { userId, announcementId }
    });
    return status;
  }

  /**
   * Mark announcement as viewed
   * @param {number} userId - User ID
   * @param {string} announcementId - Announcement ID
   * @returns {Promise<UserAnnouncementStatus>}
   */
  static async markViewed(userId, announcementId) {
    const status = await this.getOrCreate(userId, announcementId);
    if (!status.viewedAt) {
      status.viewedAt = new Date();
      await status.save();

      // Increment announcement view count
      const Announcement = require('./announcement');
      await Announcement.incrementViewCount(announcementId);
    }
    return status;
  }

  /**
   * Mark announcement as acknowledged
   * @param {number} userId - User ID
   * @param {string} announcementId - Announcement ID
   * @returns {Promise<UserAnnouncementStatus>}
   */
  static async markAcknowledged(userId, announcementId) {
    const status = await this.getOrCreate(userId, announcementId);
    if (!status.acknowledgedAt) {
      status.acknowledgedAt = new Date();
      if (!status.viewedAt) {
        status.viewedAt = new Date();
      }
      await status.save();

      // Increment announcement acknowledgment count
      const Announcement = require('./announcement');
      await Announcement.incrementAcknowledgmentCount(announcementId);
    }
    return status;
  }

  /**
   * Mark announcement as dismissed
   * @param {number} userId - User ID
   * @param {string} announcementId - Announcement ID
   * @returns {Promise<UserAnnouncementStatus>}
   */
  static async markDismissed(userId, announcementId) {
    const status = await this.getOrCreate(userId, announcementId);
    status.dismissedAt = new Date();
    if (!status.viewedAt) {
      status.viewedAt = new Date();
    }
    await status.save();
    return status;
  }

  /**
   * Get all statuses for a user
   * @param {number} userId - User ID
   * @returns {Promise<UserAnnouncementStatus[]>}
   */
  static async getForUser(userId) {
    return this.findAll({
      where: { userId }
    });
  }

  /**
   * Get unread count for a user
   * @param {number} userId - User ID
   * @param {string[]} activeAnnouncementIds - IDs of currently active announcements
   * @returns {Promise<number>}
   */
  static async getUnreadCount(userId, activeAnnouncementIds) {
    if (!activeAnnouncementIds || activeAnnouncementIds.length === 0) {
      return 0;
    }

    const readStatuses = await this.findAll({
      where: {
        userId,
        announcementId: { [Op.in]: activeAnnouncementIds },
        viewedAt: { [Op.ne]: null }
      }
    });

    return activeAnnouncementIds.length - readStatuses.length;
  }

  /**
   * Check if user has acknowledged an announcement
   * @param {number} userId - User ID
   * @param {string} announcementId - Announcement ID
   * @returns {Promise<boolean>}
   */
  static async hasAcknowledged(userId, announcementId) {
    const status = await this.findOne({
      where: {
        userId,
        announcementId,
        acknowledgedAt: { [Op.ne]: null }
      }
    });
    return !!status;
  }

  /**
   * Check if user has dismissed an announcement
   * @param {number} userId - User ID
   * @param {string} announcementId - Announcement ID
   * @returns {Promise<boolean>}
   */
  static async hasDismissed(userId, announcementId) {
    const status = await this.findOne({
      where: {
        userId,
        announcementId,
        dismissedAt: { [Op.ne]: null }
      }
    });
    return !!status;
  }
}

UserAnnouncementStatus.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  announcementId: {
    type: DataTypes.UUID,
    allowNull: false
  },

  viewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  acknowledgedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  dismissedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'UserAnnouncementStatus',
  tableName: 'UserAnnouncementStatuses',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'announcementId'],
      name: 'user_announcement_unique'
    }
  ]
});

module.exports = UserAnnouncementStatus;
