'use strict';

/**
 * Migration: Add image fingerprint columns to Characters table
 *
 * Adds SHA-256 hash for exact duplicate detection and
 * perceptual hashes (dHash, aHash) for similarity detection.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Characters');

    // Add SHA-256 hash column (64 hex characters)
    if (!tableInfo.sha256Hash) {
      await queryInterface.addColumn('Characters', 'sha256Hash', {
        type: Sequelize.STRING(64),
        allowNull: true
      });
    }

    // Add dHash column (16 hex characters for 64-bit hash)
    if (!tableInfo.dHash) {
      await queryInterface.addColumn('Characters', 'dHash', {
        type: Sequelize.STRING(16),
        allowNull: true
      });
    }

    // Add aHash column (16 hex characters for 64-bit hash)
    if (!tableInfo.aHash) {
      await queryInterface.addColumn('Characters', 'aHash', {
        type: Sequelize.STRING(16),
        allowNull: true
      });
    }

    // Add duplicate warning flag
    if (!tableInfo.duplicateWarning) {
      await queryInterface.addColumn('Characters', 'duplicateWarning', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    // Add index on sha256Hash for fast exact duplicate lookups
    try {
      await queryInterface.addIndex('Characters', ['sha256Hash'], {
        name: 'idx_characters_sha256',
        unique: false
      });
    } catch (err) {
      // Index might already exist
      console.log('Index idx_characters_sha256 may already exist:', err.message);
    }
  },

  async down(queryInterface) {
    // Remove index first
    try {
      await queryInterface.removeIndex('Characters', 'idx_characters_sha256');
    } catch (err) {
      console.log('Index removal failed:', err.message);
    }

    // Remove columns
    const tableInfo = await queryInterface.describeTable('Characters');

    if (tableInfo.sha256Hash) {
      await queryInterface.removeColumn('Characters', 'sha256Hash');
    }
    if (tableInfo.dHash) {
      await queryInterface.removeColumn('Characters', 'dHash');
    }
    if (tableInfo.aHash) {
      await queryInterface.removeColumn('Characters', 'aHash');
    }
    if (tableInfo.duplicateWarning) {
      await queryInterface.removeColumn('Characters', 'duplicateWarning');
    }
  }
};
