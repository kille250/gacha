'use strict';

/**
 * Migration: Add Danbooru metadata columns to Characters table
 *
 * Adds optional fields for storing Danbooru source information
 * when characters are created from Danbooru images.
 * These fields are nullable and backward-compatible.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Characters');

    // Add Danbooru post ID column
    if (!tableInfo.danbooruPostId) {
      await queryInterface.addColumn('Characters', 'danbooruPostId', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    // Add Danbooru source URL column (original source from post)
    if (!tableInfo.danbooruSourceUrl) {
      await queryInterface.addColumn('Characters', 'danbooruSourceUrl', {
        type: Sequelize.STRING(512),
        allowNull: true
      });
    }

    // Add Danbooru tags as JSON text
    if (!tableInfo.danbooruTags) {
      await queryInterface.addColumn('Characters', 'danbooruTags', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    // Add index on danbooruPostId for lookup by Danbooru ID
    try {
      await queryInterface.addIndex('Characters', ['danbooruPostId'], {
        name: 'idx_characters_danbooru_post_id',
        unique: false
      });
    } catch (err) {
      // Index might already exist
      console.log('Index idx_characters_danbooru_post_id may already exist:', err.message);
    }
  },

  async down(queryInterface) {
    // Remove index first
    try {
      await queryInterface.removeIndex('Characters', 'idx_characters_danbooru_post_id');
    } catch (err) {
      console.log('Index removal failed:', err.message);
    }

    // Remove columns
    const tableInfo = await queryInterface.describeTable('Characters');

    if (tableInfo.danbooruPostId) {
      await queryInterface.removeColumn('Characters', 'danbooruPostId');
    }
    if (tableInfo.danbooruSourceUrl) {
      await queryInterface.removeColumn('Characters', 'danbooruSourceUrl');
    }
    if (tableInfo.danbooruTags) {
      await queryInterface.removeColumn('Characters', 'danbooruTags');
    }
  }
};
