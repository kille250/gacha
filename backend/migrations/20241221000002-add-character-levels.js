/**
 * Migration: Add level and duplicateCount to UserCharacters
 * 
 * This enables card leveling when users roll duplicate characters.
 * - level: Current level of the card (1-5)
 * - duplicateCount: Number of times this character was rolled after the first
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('UserCharacters')) {
      console.log('UserCharacters table does not exist yet, skipping migration');
      return;
    }

    // Check if columns already exist
    const tableInfo = await queryInterface.describeTable('UserCharacters');
    
    if (!tableInfo.level) {
      await queryInterface.addColumn('UserCharacters', 'level', {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      });
      console.log('Added level column to UserCharacters');
    }
    
    if (!tableInfo.duplicateCount) {
      await queryInterface.addColumn('UserCharacters', 'duplicateCount', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      });
      console.log('Added duplicateCount column to UserCharacters');
    }
  },

  down: async (queryInterface, _Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('UserCharacters')) {
      return;
    }

    const tableInfo = await queryInterface.describeTable('UserCharacters');
    
    if (tableInfo.level) {
      await queryInterface.removeColumn('UserCharacters', 'level');
    }
    
    if (tableInfo.duplicateCount) {
      await queryInterface.removeColumn('UserCharacters', 'duplicateCount');
    }
  }
};

