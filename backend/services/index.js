/**
 * Services Index
 * 
 * Central export for all service modules
 */

const fishingService = require('./fishingService');
const rankService = require('./rankService');
const tradeService = require('./tradeService');

module.exports = {
  ...fishingService,
  ...rankService,
  tradeService
};

