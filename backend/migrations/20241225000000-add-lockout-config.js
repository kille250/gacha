'use strict';

/**
 * Migration: Add lockout configuration to SecurityConfigs
 * Makes lockout settings admin-configurable
 */

const LOCKOUT_CONFIGS = [
  { 
    key: 'LOCKOUT_MAX_ATTEMPTS', 
    value: '10', 
    category: 'enforcement', 
    description: 'Maximum failed attempts before account lockout' 
  },
  { 
    key: 'LOCKOUT_DURATION_MS', 
    value: '900000', 
    category: 'enforcement', 
    description: 'Lockout duration in milliseconds (900000 = 15 minutes)' 
  },
  { 
    key: 'LOCKOUT_WINDOW_MS', 
    value: '900000', 
    category: 'enforcement', 
    description: 'Time window for counting failed attempts (900000 = 15 minutes)' 
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
      console.log('[Migration] SecurityConfigs table does not exist, skipping lockout config seed');
      return;
    }
    
    // Insert lockout configs
    for (const config of LOCKOUT_CONFIGS) {
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
          console.log(`[Migration] Added lockout config: ${config.key}`);
        }
      } catch (insertErr) {
        console.log(`[Migration] Could not insert ${config.key}:`, insertErr.message);
      }
    }
  },

  async down(queryInterface) {
    const keys = LOCKOUT_CONFIGS.map(c => c.key);
    await queryInterface.bulkDelete('SecurityConfigs', {
      key: keys
    });
  }
};


