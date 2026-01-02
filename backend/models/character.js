const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { deriveElement } = require('../config/essenceTap');

const Character = sequelize.define('Character', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false
  },
  series: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rarity: {
    type: DataTypes.STRING,
    defaultValue: 'common'
  },
  // Element for Essence Tap bonuses: fire, water, earth, air, light, dark, neutral
  element: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null
  },
  isR18: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Image fingerprinting fields for duplicate detection
  sha256Hash: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  dHash: {
    type: DataTypes.STRING(16),
    allowNull: true
  },
  aHash: {
    type: DataTypes.STRING(16),
    allowNull: true
  },
  duplicateWarning: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Video fingerprinting fields
  mediaType: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'image'
  },
  frameHashes: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('frameHashes');
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    },
    set(value) {
      if (value === null || value === undefined) {
        this.setDataValue('frameHashes', null);
      } else {
        this.setDataValue('frameHashes', JSON.stringify(value));
      }
    }
  },
  representativeDHash: {
    type: DataTypes.STRING(16),
    allowNull: true
  },
  representativeAHash: {
    type: DataTypes.STRING(16),
    allowNull: true
  },
  duration: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  frameCount: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Danbooru source metadata (optional - only set for characters created from Danbooru)
  danbooruPostId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  danbooruSourceUrl: {
    type: DataTypes.STRING(512),
    allowNull: true
  },
  danbooruTags: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('danbooruTags');
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    },
    set(value) {
      if (value === null || value === undefined) {
        this.setDataValue('danbooruTags', null);
      } else {
        this.setDataValue('danbooruTags', JSON.stringify(value));
      }
    }
  }
});

// Auto-assign element for new characters if not explicitly set
Character.beforeCreate((character) => {
  if (!character.element) {
    // Use a temporary ID based on timestamp for derivation before the real ID is assigned
    // This ensures deterministic element assignment
    const tempId = Date.now() % 1000000;
    character.element = deriveElement(tempId, character.rarity || 'common');
  }
});

// After create, update with the real ID-based element for consistency
Character.afterCreate(async (character) => {
  // Re-derive element using actual ID for deterministic results
  const derivedElement = deriveElement(character.id, character.rarity || 'common');
  if (character.element !== derivedElement) {
    await character.update({ element: derivedElement });
  }
});

module.exports = Character;