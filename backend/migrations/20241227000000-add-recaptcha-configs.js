'use strict';

/**
 * Migration: Add missing reCAPTCHA configuration values
 * 
 * These configs exist in securityConfigService DEFAULTS but were not seeded,
 * making them invisible in the admin UI.
 */

const MISSING_RECAPTCHA_CONFIGS = [
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
    for (const config of MISSING_RECAPTCHA_CONFIGS) {
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
    const keys = MISSING_RECAPTCHA_CONFIGS.map(c => c.key);
    await queryInterface.bulkDelete('SecurityConfigs', {
      key: keys
    });
  }
};

