'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SecurityConfigs', {
      key: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'general'
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Seed default security configuration values
    const now = new Date().toISOString();
    await queryInterface.bulkInsert('SecurityConfigs', [
      // Risk Thresholds
      {
        key: 'RISK_THRESHOLD_MONITORING',
        value: '30',
        description: 'Risk score threshold for monitoring',
        category: 'risk_thresholds',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'RISK_THRESHOLD_SOFT_RESTRICTION',
        value: '50',
        description: 'Risk score threshold for soft restriction (CAPTCHA required)',
        category: 'risk_thresholds',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'RISK_THRESHOLD_SHADOWBAN',
        value: '70',
        description: 'Risk score threshold for automatic shadowban',
        category: 'risk_thresholds',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'RISK_THRESHOLD_TEMP_BAN',
        value: '85',
        description: 'Risk score threshold for automatic temp ban',
        category: 'risk_thresholds',
        createdAt: now,
        updatedAt: now
      },
      // Rate Limits
      {
        key: 'RATE_LIMIT_GENERAL_WINDOW',
        value: '60000',
        description: 'General rate limit window in milliseconds',
        category: 'rate_limits',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'RATE_LIMIT_GENERAL_MAX',
        value: '100',
        description: 'General rate limit max requests per window',
        category: 'rate_limits',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'RATE_LIMIT_SENSITIVE_WINDOW',
        value: '3600000',
        description: 'Sensitive actions rate limit window (1 hour)',
        category: 'rate_limits',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'RATE_LIMIT_SENSITIVE_MAX',
        value: '20',
        description: 'Sensitive actions max requests per window',
        category: 'rate_limits',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'RATE_LIMIT_SIGNUP_WINDOW',
        value: '86400000',
        description: 'Signup rate limit window (24 hours)',
        category: 'rate_limits',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'RATE_LIMIT_SIGNUP_MAX',
        value: '5',
        description: 'Max signups per IP per window',
        category: 'rate_limits',
        createdAt: now,
        updatedAt: now
      },
      // CAPTCHA Settings
      {
        key: 'CAPTCHA_FAILED_ATTEMPTS_THRESHOLD',
        value: '3',
        description: 'Failed attempts before CAPTCHA required',
        category: 'captcha',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'CAPTCHA_TOKEN_VALIDITY_MS',
        value: '300000',
        description: 'CAPTCHA token validity period (5 minutes)',
        category: 'captcha',
        createdAt: now,
        updatedAt: now
      },
      // Policy Settings
      {
        key: 'POLICY_TRADE_ACCOUNT_AGE_HOURS',
        value: '24',
        description: 'Minimum account age (hours) required for trading',
        category: 'policies',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'POLICY_WARNING_ESCALATION_THRESHOLD',
        value: '3',
        description: 'Number of warnings before automatic temp ban',
        category: 'policies',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'POLICY_WARNING_ESCALATION_DURATION',
        value: '7d',
        description: 'Duration of temp ban after warning escalation',
        category: 'policies',
        createdAt: now,
        updatedAt: now
      },
      // Shadowban Settings
      {
        key: 'SHADOWBAN_REWARD_MULTIPLIER',
        value: '0.1',
        description: 'Reward multiplier for shadowbanned users (10%)',
        category: 'enforcement',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'SHADOWBAN_TICKET_MULTIPLIER',
        value: '0',
        description: 'Ticket multiplier for shadowbanned users (0%)',
        category: 'enforcement',
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'SHADOWBAN_FISH_MULTIPLIER',
        value: '0.5',
        description: 'Fish quantity multiplier for shadowbanned users (50%)',
        category: 'enforcement',
        createdAt: now,
        updatedAt: now
      },
      // Risk Score Decay
      {
        key: 'RISK_SCORE_DECAY_PERCENTAGE',
        value: '0.1',
        description: 'Daily risk score decay percentage (10%)',
        category: 'risk_thresholds',
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SecurityConfigs');
  }
};

