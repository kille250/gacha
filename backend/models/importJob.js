// models/importJob.js
// Background import job tracking for anime character imports
const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db');

const ImportJob = sequelize.define('ImportJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  // Job status
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },

  // Job type (for future extensibility)
  jobType: {
    type: DataTypes.STRING(50),
    defaultValue: 'anime_import',
    allowNull: false
  },

  // Admin who created the job
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  // Import configuration
  series: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  defaultRarity: {
    type: DataTypes.STRING(20),
    defaultValue: 'common'
  },
  autoRarity: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  // Characters to import (stored as JSON)
  charactersData: {
    type: DataTypes.JSON,
    allowNull: false
  },

  // Progress tracking
  totalCharacters: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  processedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  successCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  errorCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  // Results
  createdCharacters: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  errors: {
    type: DataTypes.JSON,
    defaultValue: []
  },

  // Timing
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  // Error message if failed
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'ImportJobs',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['createdBy'] },
    { fields: ['createdAt'] }
  ]
});

// Class methods

/**
 * Create a new import job
 */
ImportJob.createJob = async function(adminId, { characters, series, defaultRarity, autoRarity }) {
  return await ImportJob.create({
    createdBy: adminId,
    series,
    defaultRarity: defaultRarity || 'common',
    autoRarity: autoRarity || false,
    charactersData: characters,
    totalCharacters: characters.length,
    status: 'pending'
  });
};

/**
 * Get pending jobs ready for processing (oldest first)
 */
ImportJob.getPendingJobs = async function(limit = 1) {
  return await ImportJob.findAll({
    where: { status: 'pending' },
    order: [['createdAt', 'ASC']],
    limit
  });
};

/**
 * Get job with status check
 */
ImportJob.getJobForUser = async function(jobId, userId) {
  return await ImportJob.findOne({
    where: {
      id: jobId,
      createdBy: userId
    }
  });
};

/**
 * Clean up old completed/failed jobs (older than 24 hours)
 */
ImportJob.cleanupOldJobs = async function(hoursOld = 24) {
  const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
  return await ImportJob.destroy({
    where: {
      status: { [Op.in]: ['completed', 'failed', 'cancelled'] },
      completedAt: { [Op.lt]: cutoff }
    }
  });
};

// Instance methods

/**
 * Mark job as processing
 */
ImportJob.prototype.markProcessing = async function() {
  this.status = 'processing';
  this.startedAt = new Date();
  await this.save();
};

/**
 * Update progress
 */
ImportJob.prototype.updateProgress = async function(processedCount, successCount, errorCount) {
  this.processedCount = processedCount;
  this.successCount = successCount;
  this.errorCount = errorCount;
  await this.save();
};

/**
 * Add a successfully created character
 */
ImportJob.prototype.addCreatedCharacter = async function(character) {
  const created = this.createdCharacters || [];
  created.push({
    id: character.id,
    name: character.name,
    rarity: character.rarity,
    image: character.image
  });
  this.createdCharacters = created;
  this.successCount = created.length;
  this.processedCount = this.successCount + this.errorCount;
  await this.save();
};

/**
 * Add an error
 */
ImportJob.prototype.addError = async function(error) {
  const errors = this.errors || [];
  errors.push(error);
  this.errors = errors;
  this.errorCount = errors.length;
  this.processedCount = this.successCount + this.errorCount;
  await this.save();
};

/**
 * Mark job as completed
 */
ImportJob.prototype.markCompleted = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  await this.save();
};

/**
 * Mark job as failed
 */
ImportJob.prototype.markFailed = async function(errorMessage) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.errorMessage = errorMessage;
  await this.save();
};

/**
 * Get progress percentage
 */
ImportJob.prototype.getProgress = function() {
  if (this.totalCharacters === 0) return 100;
  return Math.round((this.processedCount / this.totalCharacters) * 100);
};

/**
 * Get public status info (for API response)
 */
ImportJob.prototype.toStatusResponse = function() {
  return {
    jobId: this.id,
    status: this.status,
    series: this.series,
    autoRarity: this.autoRarity,
    progress: {
      total: this.totalCharacters,
      processed: this.processedCount,
      success: this.successCount,
      errors: this.errorCount,
      percentage: this.getProgress()
    },
    createdCharacters: this.status === 'completed' ? this.createdCharacters : undefined,
    errors: this.errors.length > 0 ? this.errors : undefined,
    errorMessage: this.errorMessage,
    startedAt: this.startedAt,
    completedAt: this.completedAt,
    createdAt: this.createdAt
  };
};

module.exports = ImportJob;
