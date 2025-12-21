'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Rarities');
    
    if (!tableInfo.minimumRate) {
      // Add minimumRate column to Rarities table
      await queryInterface.addColumn('Rarities', 'minimumRate', {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      });
      console.log('Added minimumRate column to Rarities');

      // Update common rarity to have 35% minimum (matching the old hardcoded behavior)
      await queryInterface.sequelize.query(`
        UPDATE "Rarities" 
        SET "minimumRate" = 35 
        WHERE "name" = 'common'
      `);
      console.log('Set common rarity minimumRate to 35%');
    } else {
      console.log('minimumRate column already exists in Rarities');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Rarities');
    
    if (tableInfo.minimumRate) {
      await queryInterface.removeColumn('Rarities', 'minimumRate');
      console.log('Removed minimumRate column from Rarities');
    }
  }
};
