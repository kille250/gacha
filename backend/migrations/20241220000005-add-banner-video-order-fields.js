'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Banners');
    
    if (!tableInfo.videoUrl) {
      await queryInterface.addColumn('Banners', 'videoUrl', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('Added videoUrl column to Banners');
    }
    
    if (!tableInfo.displayOrder) {
      await queryInterface.addColumn('Banners', 'displayOrder', {
        type: Sequelize.INTEGER,
        defaultValue: 0
      });
      console.log('Added displayOrder column to Banners');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Banners', 'videoUrl');
    await queryInterface.removeColumn('Banners', 'displayOrder');
  }
};

