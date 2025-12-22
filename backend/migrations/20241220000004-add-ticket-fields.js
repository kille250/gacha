'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (!tableInfo.rollTickets) {
      await queryInterface.addColumn('Users', 'rollTickets', {
        type: Sequelize.INTEGER,
        defaultValue: 0
      });
      console.log('Added rollTickets column to Users');
    }
    
    if (!tableInfo.premiumTickets) {
      await queryInterface.addColumn('Users', 'premiumTickets', {
        type: Sequelize.INTEGER,
        defaultValue: 0
      });
      console.log('Added premiumTickets column to Users');
    }
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn('Users', 'rollTickets');
    await queryInterface.removeColumn('Users', 'premiumTickets');
  }
};

