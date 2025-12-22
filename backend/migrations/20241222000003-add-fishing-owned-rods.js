'use strict';

/**
 * Migration: Add Fishing Owned Rods
 * 
 * Adds a field to track all rods a user has purchased,
 * fixing the bug where players could only equip their most recently bought rod.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (!tableInfo.fishingOwnedRods) {
      await queryInterface.addColumn('Users', 'fishingOwnedRods', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '["basic"]'
      });
      
      // Migrate existing data: if user has a non-basic rod, they must own it
      // Also ensure they own all rods up to their current rod's tier
      await queryInterface.sequelize.query(`
        UPDATE Users 
        SET fishingOwnedRods = CASE 
          WHEN fishingRod = 'master' THEN '["basic","bronze","silver","gold","diamond","master"]'
          WHEN fishingRod = 'diamond' THEN '["basic","bronze","silver","gold","diamond"]'
          WHEN fishingRod = 'gold' THEN '["basic","bronze","silver","gold"]'
          WHEN fishingRod = 'silver' THEN '["basic","bronze","silver"]'
          WHEN fishingRod = 'bronze' THEN '["basic","bronze"]'
          ELSE '["basic"]'
        END
        WHERE fishingRod IS NOT NULL
      `);
    }
  },

  async down(queryInterface, _Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (tableInfo.fishingOwnedRods) {
      await queryInterface.removeColumn('Users', 'fishingOwnedRods');
    }
  }
};

