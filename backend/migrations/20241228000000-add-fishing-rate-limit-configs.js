'use strict';

/**
 * Migration: Add fishing-specific rate limit configurations
 * These configs were missing from the original seed, causing errors when
 * express-rate-limit tried to use null values for headers.
 */

const FISHING_RATE_LIMIT_CONFIGS = [
  // Fishing rate limits (aligned with gameplay pacing)
  { key: 'RATE_LIMIT_FISHING_WINDOW', value: '60000', category: 'rate_limits', description: 'General fishing rate limit window (60000 = 1 minute)' },
  { key: 'RATE_LIMIT_FISHING_MAX', value: '15', category: 'rate_limits', description: 'Maximum fishing requests per window' },
  { key: 'RATE_LIMIT_FISHING_CAST_WINDOW', value: '60000', category: 'rate_limits', description: 'Cast rate limit window (60000 = 1 minute)' },
  { key: 'RATE_LIMIT_FISHING_CAST_MAX', value: '15', category: 'rate_limits', description: 'Maximum casts per window (12/min at 5s cooldown + burst)' },
  { key: 'RATE_LIMIT_FISHING_AUTOFISH_WINDOW', value: '60000', category: 'rate_limits', description: 'Autofish rate limit window (60000 = 1 minute)' },
  { key: 'RATE_LIMIT_FISHING_AUTOFISH_MAX', value: '12', category: 'rate_limits', description: 'Maximum autofishes per window (10/min at 6s cooldown + burst)' },
  { key: 'RATE_LIMIT_FISHING_PURCHASE_WINDOW', value: '300000', category: 'rate_limits', description: 'Fishing purchase rate limit window (300000 = 5 minutes)' },
  { key: 'RATE_LIMIT_FISHING_PURCHASE_MAX', value: '5', category: 'rate_limits', description: 'Maximum fishing purchases (rods/areas) per window' },
  { key: 'RATE_LIMIT_REWARD_CLAIM_WINDOW', value: '60000', category: 'rate_limits', description: 'Reward claim rate limit window (60000 = 1 minute)' },
  { key: 'RATE_LIMIT_REWARD_CLAIM_MAX', value: '10', category: 'rate_limits', description: 'Maximum reward claims per window' },
  // Auth rate limits
  { key: 'RATE_LIMIT_AUTH_WINDOW', value: '900000', category: 'rate_limits', description: 'Auth rate limit window (900000 = 15 minutes)' },
  { key: 'RATE_LIMIT_AUTH_MAX', value: '20', category: 'rate_limits', description: 'Maximum auth attempts per window' },
  { key: 'RATE_LIMIT_ROLL_WINDOW', value: '60000', category: 'rate_limits', description: 'Gacha roll rate limit window (60000 = 1 minute)' },
  { key: 'RATE_LIMIT_ROLL_MAX', value: '120', category: 'rate_limits', description: 'Maximum gacha rolls per window' }
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Check if table exists first
    try {
      await queryInterface.sequelize.query(
        'SELECT 1 FROM "SecurityConfigs" LIMIT 1',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
    } catch (_err) {
      console.log('[Migration] SecurityConfigs table does not exist, skipping seed');
      return;
    }

    // Insert each config if it doesn't exist
    for (const config of FISHING_RATE_LIMIT_CONFIGS) {
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
          console.log(`[Migration] Added ${config.key}`);
        } else {
          console.log(`[Migration] ${config.key} already exists, skipping`);
        }
      } catch (insertErr) {
        console.log(`[Migration] Could not insert ${config.key}:`, insertErr.message);
      }
    }
  },

  async down(queryInterface) {
    const keys = FISHING_RATE_LIMIT_CONFIGS.map(c => c.key);
    await queryInterface.bulkDelete('SecurityConfigs', {
      key: keys
    });
  }
};
