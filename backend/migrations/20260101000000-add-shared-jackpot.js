'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create SharedJackpots table
    await queryInterface.createTable('SharedJackpots', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      jackpotType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'essence_tap_main',
        unique: true
      },
      currentAmount: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 1000000
      },
      seedAmount: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 1000000
      },
      totalContributions: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      totalWins: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lastWinnerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      lastWinAmount: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      lastWinDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      largestWin: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      contributorCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Seed the main jackpot
    await queryInterface.bulkInsert('SharedJackpots', [{
      jackpotType: 'essence_tap_main',
      currentAmount: 1000000,
      seedAmount: 1000000,
      totalContributions: 0,
      totalWins: 0,
      largestWin: 0,
      contributorCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SharedJackpots');
  }
};
