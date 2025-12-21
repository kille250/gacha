'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (!tableInfo.autofishEnabled) {
      await queryInterface.addColumn('Users', 'autofishEnabled', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log('Added autofishEnabled column to Users');
    }
    
    if (!tableInfo.autofishUnlockedByRank) {
      await queryInterface.addColumn('Users', 'autofishUnlockedByRank', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log('Added autofishUnlockedByRank column to Users');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'autofishEnabled');
    await queryInterface.removeColumn('Users', 'autofishUnlockedByRank');
  }
};

