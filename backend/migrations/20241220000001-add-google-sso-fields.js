'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');
    
    // Add email if not exists
    if (!tableInfo.email) {
      await queryInterface.addColumn('Users', 'email', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      });
      console.log('Added email column to Users');
    }
    
    // Add googleId if not exists
    if (!tableInfo.googleId) {
      await queryInterface.addColumn('Users', 'googleId', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      });
      console.log('Added googleId column to Users');
    }
    
    // Add googleEmail if not exists
    if (!tableInfo.googleEmail) {
      await queryInterface.addColumn('Users', 'googleEmail', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('Added googleEmail column to Users');
    }
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn('Users', 'googleEmail');
    await queryInterface.removeColumn('Users', 'googleId');
    await queryInterface.removeColumn('Users', 'email');
  }
};

