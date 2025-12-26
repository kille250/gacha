'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ImportJobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false
      },
      jobType: {
        type: Sequelize.STRING(50),
        defaultValue: 'anime_import',
        allowNull: false
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      series: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      defaultRarity: {
        type: Sequelize.STRING(20),
        defaultValue: 'common'
      },
      autoRarity: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      charactersData: {
        type: Sequelize.JSON,
        allowNull: false
      },
      totalCharacters: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      processedCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      successCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      errorCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdCharacters: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      errors: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('ImportJobs', ['status']);
    await queryInterface.addIndex('ImportJobs', ['createdBy']);
    await queryInterface.addIndex('ImportJobs', ['createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ImportJobs');
  }
};
