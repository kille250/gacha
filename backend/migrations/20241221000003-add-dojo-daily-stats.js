'use strict';

/**
 * Migration: Add Dojo Daily Stats & Ticket Pity Fields
 * 
 * Adds fields for:
 * - Daily cap tracking (points, tickets per day)
 * - Ticket pity system (accumulated progress towards guaranteed tickets)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    // Add dojoDailyStats - JSON object tracking daily rewards claimed
    if (!tableInfo.dojoDailyStats) {
      await queryInterface.addColumn('Users', 'dojoDailyStats', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '{}',
        comment: 'JSON object tracking daily dojo rewards for cap enforcement'
      });
    }
    
    // Add dojoTicketProgress - Accumulated ticket progress for pity system
    if (!tableInfo.dojoTicketProgress) {
      await queryInterface.addColumn('Users', 'dojoTicketProgress', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '{"roll":0,"premium":0}',
        comment: 'JSON object tracking accumulated ticket progress for pity system'
      });
    }
    
    console.log('[OK] Added dojo daily stats and ticket pity fields to Users table');
  },

  async down(queryInterface, _Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (tableInfo.dojoDailyStats) {
      await queryInterface.removeColumn('Users', 'dojoDailyStats');
    }
    
    if (tableInfo.dojoTicketProgress) {
      await queryInterface.removeColumn('Users', 'dojoTicketProgress');
    }
    
    console.log('[OK] Removed dojo daily stats and ticket pity fields from Users table');
  }
};


