/**
 * AuditEvent Model
 * 
 * Stores security-relevant events for traceability and analysis.
 * Used for tracking user actions, admin decisions, and automated enforcement.
 */
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class AuditEvent extends Model {
  /**
   * Create an audit event with structured data
   * @param {Object} event - Event details
   * @returns {Promise<AuditEvent>}
   */
  static async log(event) {
    const {
      eventType,
      severity = 'info',
      userId = null,
      adminId = null,
      targetUserId = null,
      data = {},
      ipHash = null,
      userAgent = null,
      deviceFingerprint = null
    } = event;
    
    return this.create({
      eventType,
      severity,
      userId,
      adminId,
      targetUserId,
      data: JSON.stringify(data),
      ipHash,
      userAgent: userAgent ? userAgent.substring(0, 255) : null,
      deviceFingerprint
    });
  }
  
  /**
   * Get events for a specific user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<AuditEvent[]>}
   */
  static async getForUser(userId, options = {}) {
    const { limit = 100, offset = 0, eventType = null } = options;
    
    const where = { userId };
    if (eventType) {
      where.eventType = eventType;
    }
    
    return this.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
  }
  
  /**
   * Get recent security events
   * @param {Object} options - Query options
   * @returns {Promise<AuditEvent[]>}
   */
  static async getSecurityEvents(options = {}) {
    const { limit = 100, severity = null } = options;
    
    const where = {};
    if (severity) {
      where.severity = severity;
    }
    
    return this.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit
    });
  }
}

AuditEvent.init({
  eventType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  severity: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'info',
    validate: {
      isIn: [['info', 'warning', 'critical']]
    }
  },
  
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  targetUserId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  data: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('data');
      try {
        return value ? JSON.parse(value) : {};
      } catch {
        return {};
      }
    },
    set(value) {
      this.setDataValue('data', JSON.stringify(value || {}));
    }
  },
  
  ipHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  deviceFingerprint: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'AuditEvent',
  tableName: 'AuditEvents'
});

module.exports = AuditEvent;

