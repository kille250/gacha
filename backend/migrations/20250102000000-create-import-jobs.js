'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('ImportJobs')) {
      console.log('ImportJobs table already exists, skipping creation');
      return;
    }

    // Check if ENUM type exists and create if not
    try {
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_ImportJobs_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
    } catch (err) {
      // ENUM might already exist, that's fine
      console.log('ENUM type may already exist, continuing...');
    }

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
    // Also drop the ENUM type
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ImportJobs_status";');
    } catch (err) {
      console.log('Could not drop ENUM type, may not exist');
    }
  }
};
