'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (!tableInfo.lastDailyReward) {
      await queryInterface.addColumn('Users', 'lastDailyReward', {
        type: Sequelize.DATE,
        allowNull: true
      });
      console.log('Added lastDailyReward column to Users');
    }
    
    if (!tableInfo.usernameChanged) {
      await queryInterface.addColumn('Users', 'usernameChanged', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log('Added usernameChanged column to Users');
    }
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn('Users', 'lastDailyReward');
    await queryInterface.removeColumn('Users', 'usernameChanged');
  }
};

