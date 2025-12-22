'use strict';

/**
 * Migration: Add lastAutofish field for dedicated autofish cooldown tracking
 * 
 * Previously, autofish cooldown was tracked via fishingPity.lastCast which could
 * be inconsistent. This dedicated field prevents multi-instance/restart exploits
 * and provides cleaner separation of concerns.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (!tableInfo.lastAutofish) {
      await queryInterface.addColumn('Users', 'lastAutofish', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  async down(queryInterface, _Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (tableInfo.lastAutofish) {
      await queryInterface.removeColumn('Users', 'lastAutofish');
    }
  }
};

