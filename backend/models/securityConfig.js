/**
 * SecurityConfig Model
 * 
 * Stores admin-configurable security parameters.
 * Allows runtime adjustment of security thresholds without code deployment.
 */
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class SecurityConfig extends Model {
  /**
   * Get a config value with fallback to default
   * @param {string} key - Config key
   * @param {*} defaultValue - Default if not found
   * @returns {Promise<*>} - Parsed value or default
   */
  static async getValue(key, defaultValue = null) {
    try {
      const config = await this.findByPk(key);
      if (!config) return defaultValue;
      
      // Try to parse as JSON/number
      const value = config.value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (!isNaN(value) && value.trim() !== '') {
        return parseFloat(value);
      }
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (err) {
      console.error(`[SecurityConfig] Error getting ${key}:`, err.message);
      return defaultValue;
    }
  }
  
  /**
   * Set a config value
   * @param {string} key - Config key
   * @param {*} value - Value to set
   * @param {number} adminId - Admin user ID making the change
   * @returns {Promise<SecurityConfig>}
   */
  static async setValue(key, value, adminId = null) {
    const stringValue = typeof value === 'object' 
      ? JSON.stringify(value) 
      : String(value);
    
    const [config, created] = await this.findOrCreate({
      where: { key },
      defaults: { 
        value: stringValue,
        updatedBy: adminId
      }
    });
    
    if (!created) {
      config.value = stringValue;
      config.updatedBy = adminId;
      await config.save();
    }
    
    return config;
  }
  
  /**
   * Get all configs by category
   * @param {string} category - Category name
   * @returns {Promise<Object>} - Key-value map
   */
  static async getByCategory(category) {
    const configs = await this.findAll({
      where: { category },
      order: [['key', 'ASC']]
    });
    
    const result = {};
    for (const config of configs) {
      result[config.key] = await this.getValue(config.key);
    }
    return result;
  }
  
  /**
   * Get all configs grouped by category
   * @returns {Promise<Object>} - Category -> configs map
   */
  static async getAllGrouped() {
    const configs = await this.findAll({
      order: [['category', 'ASC'], ['key', 'ASC']]
    });
    
    const grouped = {};
    for (const config of configs) {
      if (!grouped[config.category]) {
        grouped[config.category] = [];
      }
      grouped[config.category].push({
        key: config.key,
        value: await this.getValue(config.key),
        rawValue: config.value,
        description: config.description,
        updatedBy: config.updatedBy,
        updatedAt: config.updatedAt
      });
    }
    return grouped;
  }
  
  /**
   * Bulk update multiple configs
   * @param {Object} updates - Key-value pairs to update
   * @param {number} adminId - Admin user ID
   * @returns {Promise<number>} - Number of updated configs
   */
  static async bulkUpdate(updates, adminId) {
    let count = 0;
    for (const [key, value] of Object.entries(updates)) {
      await this.setValue(key, value, adminId);
      count++;
    }
    return count;
  }
}

SecurityConfig.init({
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general'
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'SecurityConfig',
  tableName: 'SecurityConfigs'
});

module.exports = SecurityConfig;

