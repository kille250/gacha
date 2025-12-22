'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Users table
    const usersInfo = await queryInterface.describeTable('Users');
    
    if (!usersInfo.allowR18) {
      await queryInterface.addColumn('Users', 'allowR18', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log('Added allowR18 column to Users');
    }
    
    if (!usersInfo.showR18) {
      await queryInterface.addColumn('Users', 'showR18', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log('Added showR18 column to Users');
    }
    
    // Characters table
    const charsInfo = await queryInterface.describeTable('Characters');
    
    if (!charsInfo.isR18) {
      await queryInterface.addColumn('Characters', 'isR18', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log('Added isR18 column to Characters');
    }
    
    // Banners table
    const bannersInfo = await queryInterface.describeTable('Banners');
    
    if (!bannersInfo.isR18) {
      await queryInterface.addColumn('Banners', 'isR18', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log('Added isR18 column to Banners');
    }
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn('Users', 'allowR18');
    await queryInterface.removeColumn('Users', 'showR18');
    await queryInterface.removeColumn('Characters', 'isR18');
    await queryInterface.removeColumn('Banners', 'isR18');
  }
};

