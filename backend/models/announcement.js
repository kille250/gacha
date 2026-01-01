/**
 * Announcement Model
 *
 * Stores system-wide announcements for maintenance notices, updates, events, etc.
 * Supports scheduling, priority levels, and various display modes.
 */
const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../config/db');

class Announcement extends Model {
  /**
   * Get all active announcements for display
   * @param {Object} options - Query options
   * @returns {Promise<Announcement[]>}
   */
  static async getActiveAnnouncements(options = {}) {
    const { targetAudience = 'all', includeExpired = false } = options;
    const now = new Date();

    const where = {
      status: 'published',
      [Op.or]: [
        { publishAt: null },
        { publishAt: { [Op.lte]: now } }
      ]
    };

    if (!includeExpired) {
      where[Op.and] = [
        {
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: now } }
          ]
        }
      ];
    }

    // Filter by target audience
    if (targetAudience !== 'all') {
      where.targetAudience = {
        [Op.in]: ['all', targetAudience]
      };
    }

    return this.findAll({
      where,
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });
  }

  /**
   * Get announcements requiring acknowledgment that user hasn't acknowledged
   * @param {number} userId - User ID
   * @returns {Promise<Announcement[]>}
   */
  static async getUnacknowledgedAnnouncements(userId) {
    const UserAnnouncementStatus = require('./userAnnouncementStatus');
    const now = new Date();

    // Get all active announcements that require acknowledgment
    const announcements = await this.findAll({
      where: {
        status: 'published',
        requiresAcknowledgment: true,
        [Op.or]: [
          { publishAt: null },
          { publishAt: { [Op.lte]: now } }
        ],
        [Op.and]: [
          {
            [Op.or]: [
              { expiresAt: null },
              { expiresAt: { [Op.gt]: now } }
            ]
          }
        ]
      },
      order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });

    // Filter out already acknowledged ones
    const announcementIds = announcements.map(a => a.id);
    const acknowledged = await UserAnnouncementStatus.findAll({
      where: {
        userId,
        announcementId: { [Op.in]: announcementIds },
        acknowledgedAt: { [Op.ne]: null }
      }
    });

    const acknowledgedIds = new Set(acknowledged.map(s => s.announcementId));
    return announcements.filter(a => !acknowledgedIds.has(a.id));
  }

  /**
   * Publish an announcement immediately
   * @param {string} announcementId - Announcement ID
   * @returns {Promise<Announcement>}
   */
  static async publish(announcementId) {
    const announcement = await this.findByPk(announcementId);
    if (!announcement) throw new Error('Announcement not found');

    announcement.status = 'published';
    announcement.publishAt = new Date();
    await announcement.save();

    return announcement;
  }

  /**
   * Archive an announcement
   * @param {string} announcementId - Announcement ID
   * @returns {Promise<Announcement>}
   */
  static async archive(announcementId) {
    const announcement = await this.findByPk(announcementId);
    if (!announcement) throw new Error('Announcement not found');

    announcement.status = 'archived';
    await announcement.save();

    return announcement;
  }

  /**
   * Increment view count
   * @param {string} announcementId - Announcement ID
   */
  static async incrementViewCount(announcementId) {
    await this.increment('viewCount', {
      where: { id: announcementId }
    });
  }

  /**
   * Increment acknowledgment count
   * @param {string} announcementId - Announcement ID
   */
  static async incrementAcknowledgmentCount(announcementId) {
    await this.increment('acknowledgmentCount', {
      where: { id: announcementId }
    });
  }

  /**
   * Get priority order value for sorting
   * @param {string} priority - Priority level
   * @returns {number}
   */
  static getPriorityOrder(priority) {
    const order = { critical: 4, high: 3, medium: 2, low: 1 };
    return order[priority] || 0;
  }
}

Announcement.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [1, 255]
    }
  },

  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 10000]
    }
  },

  type: {
    type: DataTypes.ENUM('maintenance', 'update', 'event', 'patch_notes', 'promotion', 'warning', 'info'),
    allowNull: false,
    defaultValue: 'info'
  },

  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium'
  },

  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft'
  },

  displayMode: {
    type: DataTypes.ENUM('banner', 'modal', 'inline', 'toast'),
    allowNull: false,
    defaultValue: 'banner'
  },

  targetAudience: {
    type: DataTypes.ENUM('all', 'premium', 'new_users', 'admins'),
    allowNull: false,
    defaultValue: 'all'
  },

  dismissible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },

  requiresAcknowledgment: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },

  publishAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },

  acknowledgmentCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  sequelize,
  modelName: 'Announcement',
  tableName: 'Announcements'
});

module.exports = Announcement;
