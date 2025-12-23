'use strict';

/**
 * Migration: Add missing security columns
 * 
 * Adds columns that were in the model but missing from earlier migrations:
 * - sessionInvalidatedAt
 * - usernameHistory
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    // Session invalidation for forced logout
    if (!tableInfo.sessionInvalidatedAt) {
      await queryInterface.addColumn('Users', 'sessionInvalidatedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
      console.log('[Migration] Added sessionInvalidatedAt column');
    }
    
    // Username history for tracking changes
    if (!tableInfo.usernameHistory) {
      await queryInterface.addColumn('Users', 'usernameHistory', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '[]'
      });
      console.log('[Migration] Added usernameHistory column');
    }
    
    // Also check for riskScoreHistory in case earlier migration didn't run
    if (!tableInfo.riskScoreHistory) {
      await queryInterface.addColumn('Users', 'riskScoreHistory', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '[]'
      });
      console.log('[Migration] Added riskScoreHistory column');
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (tableInfo.sessionInvalidatedAt) {
      await queryInterface.removeColumn('Users', 'sessionInvalidatedAt');
    }
    if (tableInfo.usernameHistory) {
      await queryInterface.removeColumn('Users', 'usernameHistory');
    }
    // Don't remove riskScoreHistory as it has its own migration
  }
};

