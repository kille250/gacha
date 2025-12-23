'use strict';

/**
 * Migration: Add risk score history field to Users table
 * Stores last 10 risk score changes for trend analysis
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (!tableInfo.riskScoreHistory) {
      await queryInterface.addColumn('Users', 'riskScoreHistory', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '[]'
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (tableInfo.riskScoreHistory) {
      await queryInterface.removeColumn('Users', 'riskScoreHistory');
    }
  }
};

