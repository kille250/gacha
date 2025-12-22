'use strict';

/**
 * Migration: Add Fishing Pity System
 * 
 * Adds pity counters for fishing to provide bad-luck protection.
 * After X casts without a legendary/epic, guaranteed chance increases.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (!tableInfo.fishingPity) {
      await queryInterface.addColumn('Users', 'fishingPity', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: JSON.stringify({
          legendary: 0,  // Casts since last legendary
          epic: 0,       // Casts since last epic
          lastCast: null // Timestamp of last cast (for rate limiting)
        })
      });
    }
    
    if (!tableInfo.fishingStats) {
      await queryInterface.addColumn('Users', 'fishingStats', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: JSON.stringify({
          totalCasts: 0,
          totalCatches: 0,
          perfectCatches: 0,
          fishCaught: {}  // { fishId: count }
        })
      });
    }
  },

  async down(queryInterface, _Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (tableInfo.fishingPity) {
      await queryInterface.removeColumn('Users', 'fishingPity');
    }
    if (tableInfo.fishingStats) {
      await queryInterface.removeColumn('Users', 'fishingStats');
    }
  }
};

