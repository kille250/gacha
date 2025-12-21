'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Make password column nullable for Google SSO users
    try {
      await queryInterface.changeColumn('Users', 'password', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('Made password column nullable for Google SSO users');
    } catch (err) {
      // Column might already be nullable
      console.log('Password column already nullable or skipped:', err.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // Note: This could fail if there are null passwords in the database
    await queryInterface.changeColumn('Users', 'password', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};

