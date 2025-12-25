'use strict';

/**
 * Migration: Add Standard Banner Support
 *
 * This migration:
 * 1. Adds isStandard column to Banners table
 * 2. Creates the Standard Banner if it doesn't exist
 * 3. Assigns all existing non-banner-assigned characters to the Standard Banner
 *    (maintaining backward compatibility)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add isStandard column
    const tableInfo = await queryInterface.describeTable('Banners');

    if (!tableInfo.isStandard) {
      await queryInterface.addColumn('Banners', 'isStandard', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
      console.log('Added isStandard column to Banners');
    }

    // Step 2: Check if Standard Banner already exists
    const [existingStandard] = await queryInterface.sequelize.query(
      `SELECT id FROM "Banners" WHERE "isStandard" = true LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let standardBannerId;

    if (!existingStandard) {
      // Step 3: Create the Standard Banner
      const now = new Date().toISOString();
      await queryInterface.bulkInsert('Banners', [{
        name: 'Standard Banner',
        description: 'The permanent banner containing all standard characters.',
        series: 'Standard',
        image: null,
        videoUrl: null,
        startDate: now,
        endDate: null,
        featured: false,
        costMultiplier: 1.0,
        rateMultiplier: 1.0,
        active: true,
        isR18: false,
        displayOrder: 9999, // Put at end of list
        isStandard: true,
        createdAt: now,
        updatedAt: now
      }]);
      console.log('Created Standard Banner');

      // Get the ID of the newly created banner
      const [newStandard] = await queryInterface.sequelize.query(
        `SELECT id FROM "Banners" WHERE "isStandard" = true LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      standardBannerId = newStandard.id;
    } else {
      standardBannerId = existingStandard.id;
      console.log('Standard Banner already exists');
    }

    // Step 4: Assign all characters not currently on any banner to Standard Banner
    // This ensures backward compatibility - characters that were pullable before remain pullable
    const [unassignedCharacters] = await queryInterface.sequelize.query(`
      SELECT c.id
      FROM "Characters" c
      LEFT JOIN "BannerCharacters" bc ON c.id = bc."CharacterId"
      WHERE bc."CharacterId" IS NULL
    `);

    if (unassignedCharacters.length > 0) {
      const now = new Date().toISOString();
      const assignments = unassignedCharacters.map(char => ({
        BannerId: standardBannerId,
        CharacterId: char.id,
        createdAt: now,
        updatedAt: now
      }));

      await queryInterface.bulkInsert('BannerCharacters', assignments);
      console.log(`Assigned ${unassignedCharacters.length} unassigned characters to Standard Banner`);
    } else {
      console.log('No unassigned characters to migrate');
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove character assignments from Standard Banner
    const [standardBanner] = await queryInterface.sequelize.query(
      `SELECT id FROM "Banners" WHERE "isStandard" = true LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (standardBanner) {
      await queryInterface.bulkDelete('BannerCharacters', {
        BannerId: standardBanner.id
      });

      await queryInterface.bulkDelete('Banners', {
        id: standardBanner.id
      });
      console.log('Removed Standard Banner and its character assignments');
    }

    // Remove isStandard column
    await queryInterface.removeColumn('Banners', 'isStandard');
    console.log('Removed isStandard column from Banners');
  }
};
