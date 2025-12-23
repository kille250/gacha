'use strict';

/**
 * Migration: Seed security configuration defaults
 * Initializes all SecurityConfig values with descriptions and categories
 */

const CONFIG_DEFINITIONS = [
  // Risk Thresholds
  { key: 'RISK_THRESHOLD_MONITORING', value: '30', category: 'risk_thresholds', description: 'Risk score threshold for monitoring (alerts appear)' },
  { key: 'RISK_THRESHOLD_SOFT_RESTRICTION', value: '50', category: 'risk_thresholds', description: 'Risk score threshold for soft restrictions (CAPTCHA, reduced limits)' },
  { key: 'RISK_THRESHOLD_SHADOWBAN', value: '70', category: 'risk_thresholds', description: 'Risk score threshold for automatic shadowban' },
  { key: 'RISK_THRESHOLD_TEMP_BAN', value: '85', category: 'risk_thresholds', description: 'Risk score threshold for automatic temporary ban' },
  { key: 'RISK_SCORE_DECAY_PERCENTAGE', value: '0.1', category: 'risk_thresholds', description: 'Percentage to decay risk scores by (0.1 = 10%)' },
  
  // Risk Score Weights
  { key: 'RISK_WEIGHT_NEW_DEVICE', value: '10', category: 'risk_weights', description: 'Risk points added when a new device is detected' },
  { key: 'RISK_WEIGHT_MULTIPLE_DEVICES', value: '15', category: 'risk_weights', description: 'Risk points for multiple devices (>3)' },
  { key: 'RISK_WEIGHT_SHARED_DEVICE', value: '25', category: 'risk_weights', description: 'Risk points for device shared with another account' },
  { key: 'RISK_WEIGHT_BANNED_DEVICE', value: '50', category: 'risk_weights', description: 'Risk points for device shared with banned account' },
  { key: 'RISK_WEIGHT_VELOCITY_BREACH', value: '20', category: 'risk_weights', description: 'Risk points for exceeding action velocity limits' },
  { key: 'RISK_WEIGHT_TIMING_ANOMALY', value: '15', category: 'risk_weights', description: 'Risk points for suspicious timing patterns (bot detection)' },
  { key: 'RISK_WEIGHT_PREVIOUS_WARNING', value: '10', category: 'risk_weights', description: 'Risk points per previous warning received' },
  { key: 'RISK_WEIGHT_ACCOUNT_AGE_BONUS', value: '-5', category: 'risk_weights', description: 'Risk reduction for accounts older than 30 days (negative = reduction)' },
  { key: 'RISK_WEIGHT_VERIFIED_ACCOUNT_BONUS', value: '-10', category: 'risk_weights', description: 'Risk reduction for Google-linked accounts (negative = reduction)' },
  
  // Rate Limits
  { key: 'RATE_LIMIT_GENERAL_WINDOW', value: '60000', category: 'rate_limits', description: 'General rate limit window in milliseconds (60000 = 1 minute)' },
  { key: 'RATE_LIMIT_GENERAL_MAX', value: '100', category: 'rate_limits', description: 'Maximum requests per general rate limit window' },
  { key: 'RATE_LIMIT_SENSITIVE_WINDOW', value: '3600000', category: 'rate_limits', description: 'Sensitive action rate limit window (3600000 = 1 hour)' },
  { key: 'RATE_LIMIT_SENSITIVE_MAX', value: '20', category: 'rate_limits', description: 'Maximum sensitive actions per window' },
  { key: 'RATE_LIMIT_SIGNUP_WINDOW', value: '86400000', category: 'rate_limits', description: 'Signup rate limit window (86400000 = 24 hours)' },
  { key: 'RATE_LIMIT_SIGNUP_MAX', value: '5', category: 'rate_limits', description: 'Maximum signups per IP per window' },
  { key: 'RATE_LIMIT_COUPON_WINDOW', value: '900000', category: 'rate_limits', description: 'Coupon redemption rate limit window (900000 = 15 minutes)' },
  { key: 'RATE_LIMIT_COUPON_MAX', value: '10', category: 'rate_limits', description: 'Maximum coupon attempts per window' },
  { key: 'RATE_LIMIT_BURST_WINDOW', value: '1000', category: 'rate_limits', description: 'Burst protection window (1000 = 1 second)' },
  { key: 'RATE_LIMIT_BURST_MAX', value: '10', category: 'rate_limits', description: 'Maximum requests per burst window' },
  
  // CAPTCHA Settings
  { key: 'CAPTCHA_FAILED_ATTEMPTS_THRESHOLD', value: '3', category: 'captcha', description: 'Failed attempts before CAPTCHA is required' },
  { key: 'CAPTCHA_TOKEN_VALIDITY_MS', value: '300000', category: 'captcha', description: 'CAPTCHA token validity period (300000 = 5 minutes)' },
  
  // Policy Settings
  { key: 'POLICY_TRADE_ACCOUNT_AGE_HOURS', value: '24', category: 'policies', description: 'Minimum account age in hours to trade' },
  { key: 'POLICY_WARNING_ESCALATION_THRESHOLD', value: '3', category: 'policies', description: 'Number of warnings before automatic escalation' },
  { key: 'POLICY_WARNING_ESCALATION_DURATION', value: '7d', category: 'policies', description: 'Duration of automatic ban after warning threshold (e.g., 7d, 24h)' },
  
  // Enforcement Penalties (Shadowban)
  { key: 'SHADOWBAN_REWARD_MULTIPLIER', value: '0.1', category: 'enforcement', description: 'Reward multiplier for shadowbanned users (0.1 = 10%)' },
  { key: 'SHADOWBAN_TICKET_MULTIPLIER', value: '0', category: 'enforcement', description: 'Ticket reward multiplier for shadowbanned users (0 = none)' },
  { key: 'SHADOWBAN_FISH_MULTIPLIER', value: '0.5', category: 'enforcement', description: 'Fish reward multiplier for shadowbanned users' },
  { key: 'SHADOWBAN_POINTS_MULTIPLIER', value: '0.1', category: 'enforcement', description: 'Points multiplier for shadowbanned users' },
  { key: 'SHADOWBAN_TIMING_PENALTY', value: '-100', category: 'enforcement', description: 'Timing window reduction in ms for shadowbanned users' },
  { key: 'RATE_LIMIT_PENALTY_MULTIPLIER', value: '0.5', category: 'enforcement', description: 'Daily limit multiplier for rate-limited users' },
  { key: 'RATE_LIMIT_COOLDOWN_MULTIPLIER', value: '2.0', category: 'enforcement', description: 'Cooldown multiplier for rate-limited users' }
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    
    // Use raw query to check and insert
    for (const config of CONFIG_DEFINITIONS) {
      // Check if config already exists
      const [existing] = await queryInterface.sequelize.query(
        'SELECT key FROM SecurityConfigs WHERE key = ?',
        { replacements: [config.key], type: queryInterface.sequelize.QueryTypes.SELECT }
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
      }
    }
  },

  async down(queryInterface) {
    // Remove all seeded configs
    const keys = CONFIG_DEFINITIONS.map(c => c.key);
    await queryInterface.bulkDelete('SecurityConfigs', {
      key: keys
    });
  }
};

