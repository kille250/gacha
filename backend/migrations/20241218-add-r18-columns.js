'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add allowR18 to Users table
    const usersTable = await queryInterface.describeTable('Users');
    if (!usersTable.allowR18) {
      await queryInterface.addColumn('Users', 'allowR18', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
      console.log('Added allowR18 column to Users table');
    }

    // Add isR18 to Characters table
    const charactersTable = await queryInterface.describeTable('Characters');
    if (!charactersTable.isR18) {
      await queryInterface.addColumn('Characters', 'isR18', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
      console.log('Added isR18 column to Characters table');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'allowR18');
    await queryInterface.removeColumn('Characters', 'isR18');
  }
};

