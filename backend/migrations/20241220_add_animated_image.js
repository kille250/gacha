// Migration to add animatedImage column to Characters table
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Characters', 'animatedImage', {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to animated GIF/video for premium characters'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Characters', 'animatedImage');
  }
};

