'use strict';

/**
 * Migration: Add missing security configuration values
 * 
 * Adds:
 * - Missing CAPTCHA configs (CAPTCHA_RISK_THRESHOLD, CAPTCHA_SENSITIVE_ACTIONS)
 * - Missing reCAPTCHA score (RECAPTCHA_SCORE_LOGIN)
 * - New rate limit configs for app.js limiters (auth, roll, fishing)
 * - Fixes lockout category to 'lockout' instead of 'enforcement'
 */

const NEW_CONFIGS = [
  // Missing CAPTCHA configs
  { 
    key: 'CAPTCHA_RISK_THRESHOLD', 
    value: '50', 
    category: 'captcha', 
    description: 'Risk score threshold that triggers CAPTCHA requirement' 
  },
  { 
    key: 'CAPTCHA_SENSITIVE_ACTIONS', 
    value: 'login,trade,coupon_redeem,password_change,account_link', 
    category: 'captcha', 
    description: 'Comma-separated list of actions requiring CAPTCHA when triggered' 
  },
  
  // Missing reCAPTCHA score for login
  { 
    key: 'RECAPTCHA_SCORE_LOGIN', 
    value: '0.5', 
    category: 'captcha', 
    description: 'Minimum reCAPTCHA score required for login action (0.0-1.0)' 
  },
  
  // New rate limit configs for app.js limiters
  { 
    key: 'RATE_LIMIT_AUTH_WINDOW', 
    value: '900000', 
    category: 'rate_limits', 
    description: 'Authentication rate limit window in ms (900000 = 15 minutes)' 
  },
  { 
    key: 'RATE_LIMIT_AUTH_MAX', 
    value: '20', 
    category: 'rate_limits', 
    description: 'Maximum authentication attempts per window' 
  },
  { 
    key: 'RATE_LIMIT_ROLL_WINDOW', 
    value: '60000', 
    category: 'rate_limits', 
    description: 'Gacha roll rate limit window in ms (60000 = 1 minute)' 
  },
  { 
    key: 'RATE_LIMIT_ROLL_MAX', 
    value: '120', 
    category: 'rate_limits', 
    description: 'Maximum gacha rolls per window' 
  },
  { 
    key: 'RATE_LIMIT_FISHING_WINDOW', 
    value: '60000', 
    category: 'rate_limits', 
    description: 'Fishing rate limit window in ms (60000 = 1 minute)' 
  },
  { 
    key: 'RATE_LIMIT_FISHING_MAX', 
    value: '30', 
    category: 'rate_limits', 
    description: 'Maximum fishing casts per window' 
  }
];

// Lockout configs to update category
const LOCKOUT_KEYS = ['LOCKOUT_MAX_ATTEMPTS', 'LOCKOUT_DURATION_MS', 'LOCKOUT_WINDOW_MS'];

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
    
    // Insert new configs
    for (const config of NEW_CONFIGS) {
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
        }
      } catch (insertErr) {
        console.log(`[Migration] Could not insert ${config.key}:`, insertErr.message);
      }
    }
    
    // Update lockout config categories from 'enforcement' to 'lockout'
    for (const key of LOCKOUT_KEYS) {
      try {
        await queryInterface.sequelize.query(
          'UPDATE "SecurityConfigs" SET category = :category, "updatedAt" = :now WHERE key = :key',
          { 
            replacements: { category: 'lockout', key, now }, 
            type: queryInterface.sequelize.QueryTypes.UPDATE 
          }
        );
        console.log(`[Migration] Updated category for ${key} to 'lockout'`);
      } catch (updateErr) {
        console.log(`[Migration] Could not update ${key}:`, updateErr.message);
      }
    }
  },

  async down(queryInterface) {
    // Remove new configs
    const keys = NEW_CONFIGS.map(c => c.key);
    await queryInterface.bulkDelete('SecurityConfigs', {
      key: keys
    });
    
    // Revert lockout category back to 'enforcement'
    for (const key of LOCKOUT_KEYS) {
      try {
        await queryInterface.sequelize.query(
          'UPDATE "SecurityConfigs" SET category = :category WHERE key = :key',
          { 
            replacements: { category: 'enforcement', key }, 
            type: queryInterface.sequelize.QueryTypes.UPDATE 
          }
        );
      } catch (updateErr) {
        console.log(`[Migration] Could not revert ${key}:`, updateErr.message);
      }
    }
  }
};

