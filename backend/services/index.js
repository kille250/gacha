/**
 * Services Index
 * 
 * Central export for all service modules
 */

const fishingService = require('./fishingService');
const rankService = require('./rankService');

module.exports = {
  ...fishingService,
  ...rankService
};

