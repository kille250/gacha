'use strict';

/**
 * Migration: Add reCAPTCHA configuration to SecurityConfigs
 * Adds settings for reCAPTCHA v3 integration
 */

const RECAPTCHA_CONFIGS = [
  // reCAPTCHA Settings
  { 
    key: 'RECAPTCHA_ENABLED', 
    value: 'false', 
    category: 'captcha', 
    description: 'Whether reCAPTCHA verification is enabled (requires RECAPTCHA_SECRET_KEY env var)' 
  },
  { 
    key: 'RECAPTCHA_MIN_SCORE', 
    value: '0.5', 
    category: 'captcha', 
    description: 'Minimum reCAPTCHA v3 score to pass verification (0.0-1.0, lower = stricter)' 
  },
  { 
    key: 'RECAPTCHA_SCORE_TRADE', 
    value: '0.6', 
    category: 'captcha', 
    description: 'Minimum score for trade actions (higher = more lenient)' 
  },
  { 
    key: 'RECAPTCHA_SCORE_COUPON', 
    value: '0.4', 
    category: 'captcha', 
    description: 'Minimum score for coupon redemption (lower = stricter, coupons are high-value)' 
  },
  { 
    key: 'RECAPTCHA_SCORE_PASSWORD_CHANGE', 
    value: '0.7', 
    category: 'captcha', 
    description: 'Minimum score for password changes (higher = more lenient for account recovery)' 
  },
  { 
    key: 'RECAPTCHA_SCORE_ACCOUNT_LINK', 
    value: '0.7', 
    category: 'captcha', 
    description: 'Minimum score for account linking (higher = more lenient)' 
  },
  {
    key: 'CAPTCHA_RISK_THRESHOLD',
    value: '50',
    category: 'captcha',
    description: 'Risk score at which CAPTCHA is triggered for sensitive actions'
  },
  {
    key: 'CAPTCHA_SENSITIVE_ACTIONS',
    value: 'trade,coupon_redeem,password_change,account_link',
    category: 'captcha',
    description: 'Comma-separated list of actions that can trigger CAPTCHA verification'
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
      console.log('[Migration] SecurityConfigs table does not exist, skipping reCAPTCHA config seed');
      return;
    }
    
    // Insert reCAPTCHA configs
    for (const config of RECAPTCHA_CONFIGS) {
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
          console.log(`[Migration] Added reCAPTCHA config: ${config.key}`);
        }
      } catch (insertErr) {
        console.log(`[Migration] Could not insert ${config.key}:`, insertErr.message);
      }
    }
  },

  async down(queryInterface) {
    const keys = RECAPTCHA_CONFIGS.map(c => c.key);
    await queryInterface.bulkDelete('SecurityConfigs', {
      key: keys
    });
  }
};

