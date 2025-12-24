#!/usr/bin/env node
/**
 * Backfill Fingerprints Script
 *
 * Generates image fingerprints (SHA-256, dHash, aHash) for existing characters
 * that don't have them yet.
 *
 * Usage:
 *   node scripts/backfillFingerprints.js [--batch-size=100] [--dry-run]
 *
 * Options:
 *   --batch-size=N  Process N characters at a time (default: 100)
 *   --dry-run       Show what would be done without making changes
 *   --force         Regenerate fingerprints even for characters that have them
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Character } = require('../models');
const { getFilePath } = require('../config/upload');
const { generateFingerprints, isProcessableImage } = require('../services/imageFingerprintService');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  batchSize: 100,
  dryRun: false,
  force: false
};

for (const arg of args) {
  if (arg.startsWith('--batch-size=')) {
    options.batchSize = parseInt(arg.split('=')[1], 10) || 100;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--force') {
    options.force = true;
  }
}

async function backfillFingerprints() {
  console.log('='.repeat(60));
  console.log('Character Fingerprint Backfill Script');
  console.log('='.repeat(60));
  console.log(`Options: batchSize=${options.batchSize}, dryRun=${options.dryRun}, force=${options.force}`);
  console.log('');

  // Build query for characters needing fingerprints
  const where = options.force
    ? {}
    : { dHash: null };

  // Get total count
  const totalCount = await Character.count({ where });
  console.log(`Found ${totalCount} characters to process`);

  if (totalCount === 0) {
    console.log('No characters need fingerprint generation. Done!');
    return;
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Process in batches
  while (processed < totalCount) {
    const characters = await Character.findAll({
      where,
      limit: options.batchSize,
      offset: processed,
      order: [['id', 'ASC']]
    });

    if (characters.length === 0) break;

    console.log(`\nProcessing batch ${Math.floor(processed / options.batchSize) + 1} (${characters.length} characters)...`);

    for (const char of characters) {
      processed++;
      const progress = `[${processed}/${totalCount}]`;

      // Get file path from image URL
      if (!char.image || !char.image.startsWith('/uploads/')) {
        console.log(`${progress} SKIP: ${char.id} "${char.name}" - External URL or missing image`);
        skipped++;
        continue;
      }

      const filename = path.basename(char.image);
      const filePath = getFilePath('characters', filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`${progress} SKIP: ${char.id} "${char.name}" - File not found: ${filename}`);
        skipped++;
        continue;
      }

      // Check if image is processable
      const canProcess = await isProcessableImage(filePath);
      if (!canProcess) {
        console.log(`${progress} SKIP: ${char.id} "${char.name}" - Cannot process image`);
        skipped++;
        continue;
      }

      try {
        // Generate fingerprints
        const fingerprints = await generateFingerprints(filePath);

        if (!fingerprints) {
          console.log(`${progress} FAIL: ${char.id} "${char.name}" - Fingerprint generation returned null`);
          failed++;
          continue;
        }

        if (options.dryRun) {
          console.log(`${progress} DRY-RUN: ${char.id} "${char.name}" -> sha256=${fingerprints.sha256.substring(0, 8)}..., dHash=${fingerprints.dHash}`);
          succeeded++;
        } else {
          // Update character
          await char.update({
            sha256Hash: fingerprints.sha256,
            dHash: fingerprints.dHash,
            aHash: fingerprints.aHash
          });
          console.log(`${progress} OK: ${char.id} "${char.name}" -> dHash=${fingerprints.dHash}`);
          succeeded++;
        }
      } catch (err) {
        console.log(`${progress} FAIL: ${char.id} "${char.name}" - ${err.message}`);
        failed++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${processed}`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  if (options.dryRun) {
    console.log('\n(Dry run - no changes were made)');
  }
  console.log('');
}

// Run the script
backfillFingerprints()
  .then(() => {
    console.log('Backfill complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
