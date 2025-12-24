'use strict';

/**
 * Migration: Add video fingerprint columns to Characters table
 *
 * Extends the existing fingerprint system to support video content:
 * - mediaType: 'image', 'video', or 'animated_image'
 * - frameHashes: JSON array of per-frame hashes for videos
 * - representativeDHash: Single hash for quick cross-media comparison
 * - duration: Video duration in seconds
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Characters');

    // Add mediaType column
    if (!tableInfo.mediaType) {
      await queryInterface.addColumn('Characters', 'mediaType', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'image'
      });
    }

    // Add frameHashes column (JSON array of frame hashes for videos)
    if (!tableInfo.frameHashes) {
      await queryInterface.addColumn('Characters', 'frameHashes', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    // Add representativeDHash column (for fast cross-media lookup)
    if (!tableInfo.representativeDHash) {
      await queryInterface.addColumn('Characters', 'representativeDHash', {
        type: Sequelize.STRING(16),
        allowNull: true
      });
    }

    // Add representativeAHash column
    if (!tableInfo.representativeAHash) {
      await queryInterface.addColumn('Characters', 'representativeAHash', {
        type: Sequelize.STRING(16),
        allowNull: true
      });
    }

    // Add duration column (video duration in seconds)
    if (!tableInfo.duration) {
      await queryInterface.addColumn('Characters', 'duration', {
        type: Sequelize.FLOAT,
        allowNull: true
      });
    }

    // Add frameCount column
    if (!tableInfo.frameCount) {
      await queryInterface.addColumn('Characters', 'frameCount', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    // Add index on mediaType for filtering
    try {
      await queryInterface.addIndex('Characters', ['mediaType'], {
        name: 'idx_characters_mediatype'
      });
    } catch (err) {
      console.log('Index idx_characters_mediatype may already exist:', err.message);
    }

    // Add index on representativeDHash for cross-media lookups
    try {
      await queryInterface.addIndex('Characters', ['representativeDHash'], {
        name: 'idx_characters_representative_dhash'
      });
    } catch (err) {
      console.log('Index idx_characters_representative_dhash may already exist:', err.message);
    }

    // Backfill existing characters with mediaType 'image'
    await queryInterface.sequelize.query(
      `UPDATE "Characters" SET "mediaType" = 'image' WHERE "mediaType" IS NULL`
    );
  },

  async down(queryInterface) {
    // Remove indexes first
    try {
      await queryInterface.removeIndex('Characters', 'idx_characters_mediatype');
    } catch (err) {
      console.log('Index removal failed:', err.message);
    }
    try {
      await queryInterface.removeIndex('Characters', 'idx_characters_representative_dhash');
    } catch (err) {
      console.log('Index removal failed:', err.message);
    }

    // Remove columns
    const tableInfo = await queryInterface.describeTable('Characters');

    if (tableInfo.mediaType) {
      await queryInterface.removeColumn('Characters', 'mediaType');
    }
    if (tableInfo.frameHashes) {
      await queryInterface.removeColumn('Characters', 'frameHashes');
    }
    if (tableInfo.representativeDHash) {
      await queryInterface.removeColumn('Characters', 'representativeDHash');
    }
    if (tableInfo.representativeAHash) {
      await queryInterface.removeColumn('Characters', 'representativeAHash');
    }
    if (tableInfo.duration) {
      await queryInterface.removeColumn('Characters', 'duration');
    }
    if (tableInfo.frameCount) {
      await queryInterface.removeColumn('Characters', 'frameCount');
    }
  }
};
