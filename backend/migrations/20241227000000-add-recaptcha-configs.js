'use strict';

/**
 * Migration: Add missing security configuration values
 * 
 * These configs exist in securityConfigService DEFAULTS or are referenced in code
 * but were not seeded, making them invisible in the admin UI.
 * 
 * Categories:
 * - captcha: reCAPTCHA score thresholds and enablement
 * - policies: Policy-based access control thresholds  
 * - enforcement: Shadowban and rate limit penalty multipliers
 */

const MISSING_CONFIGS = [
  // reCAPTCHA configs
  { 
    key: 'RECAPTCHA_ENABLED', 
    value: 'false', 
    category: 'captcha', 
    description: 'Enable reCAPTCHA v3 verification (requires RECAPTCHA_SECRET_KEY env var)' 
  },
  { 
    key: 'RECAPTCHA_MIN_SCORE', 
    value: '0.5', 
    category: 'captcha', 
    description: 'Default minimum reCAPTCHA score (0.0-1.0, higher = stricter)' 
  },
  {
    key: 'RECAPTCHA_SCORE_LOGIN',
    value: '0.5',
    category: 'captcha',
    description: 'Minimum reCAPTCHA score required for login action'
  },
  {
    key: 'RECAPTCHA_SCORE_SIGNUP',
    value: '0.5',
    category: 'captcha',
    description: 'Minimum reCAPTCHA score required for signup action'
  },
  { 
    key: 'RECAPTCHA_SCORE_TRADE', 
    value: '0.6', 
    category: 'captcha', 
    description: 'Minimum reCAPTCHA score required for trade action' 
  },
  { 
    key: 'RECAPTCHA_SCORE_COUPON', 
    value: '0.4', 
    category: 'captcha', 
    description: 'Minimum reCAPTCHA score required for coupon redemption' 
  },
  { 
    key: 'RECAPTCHA_SCORE_PASSWORD_CHANGE', 
    value: '0.7', 
    category: 'captcha', 
    description: 'Minimum reCAPTCHA score required for password change' 
  },
  { 
    key: 'RECAPTCHA_SCORE_ACCOUNT_LINK', 
    value: '0.7', 
    category: 'captcha', 
    description: 'Minimum reCAPTCHA score required for account linking' 
  },
  
  // Policy thresholds
  {
    key: 'POLICY_TRADE_ACCOUNT_AGE_HOURS',
    value: '24',
    category: 'policies',
    description: 'Minimum account age in hours before trading is allowed'
  },
  {
    key: 'POLICY_WARNING_ESCALATION_THRESHOLD',
    value: '3',
    category: 'policies',
    description: 'Number of warnings before automatic temp ban escalation'
  },
  {
    key: 'POLICY_WARNING_ESCALATION_DURATION',
    value: '7d',
    category: 'policies',
    description: 'Duration of auto-ban when warning threshold reached (e.g., 7d, 24h)'
  },
  
  // Shadowban enforcement multipliers
  {
    key: 'SHADOWBAN_REWARD_MULTIPLIER',
    value: '0.1',
    category: 'enforcement',
    description: 'Reward multiplier for shadowbanned users (0.1 = 10%)'
  },
  {
    key: 'SHADOWBAN_TICKET_MULTIPLIER',
    value: '0',
    category: 'enforcement',
    description: 'Ticket reward multiplier for shadowbanned users (0 = none)'
  },
  {
    key: 'SHADOWBAN_FISH_MULTIPLIER',
    value: '0.5',
    category: 'enforcement',
    description: 'Fish quantity multiplier for shadowbanned users'
  },
  {
    key: 'SHADOWBAN_POINTS_MULTIPLIER',
    value: '0.1',
    category: 'enforcement',
    description: 'Points multiplier for shadowbanned users'
  },
  {
    key: 'SHADOWBAN_TIMING_PENALTY',
    value: '-100',
    category: 'enforcement',
    description: 'Timing window penalty in ms for shadowbanned users (negative = harder)'
  },
  
  // Rate limit enforcement multipliers
  {
    key: 'RATE_LIMIT_PENALTY_MULTIPLIER',
    value: '0.5',
    category: 'enforcement',
    description: 'Daily limit multiplier for rate-limited users (0.5 = 50%)'
  },
  {
    key: 'RATE_LIMIT_COOLDOWN_MULTIPLIER',
    value: '2.0',
    category: 'enforcement',
    description: 'Cooldown multiplier for rate-limited users (2.0 = 2x longer)'
  }
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    
    // Check if table exists
    try {
      await queryInterface.sequelize.query(
        'SELECT 1 FROM "SecurityConfigs" LIMIT 1',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
    } catch (_err) {
      console.log('[Migration] SecurityConfigs table does not exist, skipping');
      return;
    }
    
    // Insert missing configs
    for (const config of MISSING_CONFIGS) {
      try {
        const [existing] = await queryInterface.sequelize.query(
          'SELECT key FROM "SecurityConfigs" WHERE key = :key',
          { replacements: { key: config.key }, type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        
        if (!existing) {
          await queryInterface.bulkInsert('SecurityConfigs', [{
            key: config.key,
            value: config.value,
            description: config.description,
            category: config.category,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
          }]);
          console.log(`[Migration] Added config: ${config.key}`);
        } else {
          console.log(`[Migration] Config already exists: ${config.key}`);
        }
      } catch (insertErr) {
        console.log(`[Migration] Could not insert ${config.key}:`, insertErr.message);
      }
    }
  },

  async down(queryInterface) {
    // Remove added configs
    const keys = MISSING_CONFIGS.map(c => c.key);
    await queryInterface.bulkDelete('SecurityConfigs', {
      key: keys
    });
  }
};

