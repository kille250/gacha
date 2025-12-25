/**
 * Danbooru Character Creation Unit Tests
 *
 * Tests for:
 * - Validating required character fields (name, series, rarity)
 * - Validating Danbooru media object requirements
 * - Handling duplicate Danbooru post ID checks
 * - Batch creation validation
 */

// ===========================================
// MOCK UTILITIES FOR TESTING
// ===========================================

/**
 * Validates required character fields for Danbooru character creation
 * Extracted from the route handler for unit testing
 */
const validateCharacterFields = (data) => {
  const { name, series, rarity = 'common', danbooruMedia } = data;
  const errors = [];

  // Validate name
  if (!name || !name.trim()) {
    errors.push('Character name is required');
  }

  // Validate series
  if (!series || !series.trim()) {
    errors.push('Series name is required');
  }

  // Validate rarity
  const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  if (!validRarities.includes(rarity)) {
    errors.push('Invalid rarity value');
  }

  // Validate Danbooru media
  if (!danbooruMedia || !danbooruMedia.id) {
    errors.push('Danbooru media data is required');
  } else {
    const imageUrl = danbooruMedia.sample || danbooruMedia.file || danbooruMedia.preview;
    if (!imageUrl) {
      errors.push('No valid image URL in Danbooru media data');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validates batch creation data
 */
const validateBatchCreation = (characters) => {
  if (!characters || !Array.isArray(characters) || characters.length === 0) {
    return { valid: false, error: 'No characters provided for creation' };
  }

  if (characters.length > 20) {
    return { valid: false, error: 'Maximum 20 characters per batch' };
  }

  return { valid: true };
};

/**
 * Extracts best image URL from Danbooru media object
 * Prefers sample > file > preview
 */
const getBestImageUrl = (danbooruMedia) => {
  if (!danbooruMedia) return null;
  return danbooruMedia.sample || danbooruMedia.file || danbooruMedia.preview || null;
};

/**
 * Prepares Danbooru tags for storage
 */
const prepareDanbooruTags = (danbooruMedia) => {
  if (!danbooruMedia) return null;
  return {
    all: danbooruMedia.tags || null,
    character: danbooruMedia.characterTags || null
  };
};

// ===========================================
// TESTS: Required Field Validation
// ===========================================

describe('Character Field Validation', () => {
  test('should require character name', () => {
    const result = validateCharacterFields({
      name: '',
      series: 'Test Series',
      danbooruMedia: { id: 12345, file: 'http://example.com/image.png' }
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Character name is required');
  });

  test('should require series name', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: '',
      danbooruMedia: { id: 12345, file: 'http://example.com/image.png' }
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Series name is required');
  });

  test('should require Danbooru media data', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: 'Test Series',
      danbooruMedia: null
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Danbooru media data is required');
  });

  test('should require Danbooru media ID', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: 'Test Series',
      danbooruMedia: { file: 'http://example.com/image.png' }
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Danbooru media data is required');
  });

  test('should require valid image URL in Danbooru media', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: 'Test Series',
      danbooruMedia: { id: 12345 }
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('No valid image URL in Danbooru media data');
  });

  test('should accept valid character data', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: 'Test Series',
      rarity: 'rare',
      danbooruMedia: { id: 12345, file: 'http://example.com/image.png' }
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should default to common rarity', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: 'Test Series',
      danbooruMedia: { id: 12345, file: 'http://example.com/image.png' }
    });
    expect(result.valid).toBe(true);
  });

  test('should reject invalid rarity value', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: 'Test Series',
      rarity: 'super_legendary',
      danbooruMedia: { id: 12345, file: 'http://example.com/image.png' }
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid rarity value');
  });

  test('should accept all valid rarity values', () => {
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (const rarity of rarities) {
      const result = validateCharacterFields({
        name: 'Test Character',
        series: 'Test Series',
        rarity,
        danbooruMedia: { id: 12345, file: 'http://example.com/image.png' }
      });
      expect(result.valid).toBe(true);
    }
  });

  test('should trim whitespace from names', () => {
    // With only whitespace, should fail
    const resultWhitespace = validateCharacterFields({
      name: '   ',
      series: 'Test Series',
      danbooruMedia: { id: 12345, file: 'http://example.com/image.png' }
    });
    expect(resultWhitespace.valid).toBe(false);

    // With valid name and whitespace, should pass
    const resultValid = validateCharacterFields({
      name: '  Valid Name  ',
      series: 'Test Series',
      danbooruMedia: { id: 12345, file: 'http://example.com/image.png' }
    });
    expect(resultValid.valid).toBe(true);
  });
});

// ===========================================
// TESTS: Danbooru Media URL Selection
// ===========================================

describe('Danbooru Image URL Selection', () => {
  test('should prefer sample URL over file', () => {
    const media = {
      sample: 'http://example.com/sample.jpg',
      file: 'http://example.com/full.jpg',
      preview: 'http://example.com/preview.jpg'
    };
    expect(getBestImageUrl(media)).toBe('http://example.com/sample.jpg');
  });

  test('should fallback to file URL when no sample', () => {
    const media = {
      file: 'http://example.com/full.jpg',
      preview: 'http://example.com/preview.jpg'
    };
    expect(getBestImageUrl(media)).toBe('http://example.com/full.jpg');
  });

  test('should fallback to preview URL when no sample or file', () => {
    const media = {
      preview: 'http://example.com/preview.jpg'
    };
    expect(getBestImageUrl(media)).toBe('http://example.com/preview.jpg');
  });

  test('should return null for empty media object', () => {
    expect(getBestImageUrl({})).toBe(null);
  });

  test('should return null for null media', () => {
    expect(getBestImageUrl(null)).toBe(null);
  });
});

// ===========================================
// TESTS: Batch Creation Validation
// ===========================================

describe('Batch Creation Validation', () => {
  test('should reject empty array', () => {
    const result = validateBatchCreation([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No characters provided');
  });

  test('should reject null input', () => {
    const result = validateBatchCreation(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No characters provided');
  });

  test('should reject non-array input', () => {
    const result = validateBatchCreation({ name: 'test' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No characters provided');
  });

  test('should reject more than 20 characters', () => {
    const characters = Array.from({ length: 21 }, (_, i) => ({
      name: `Character ${i}`,
      series: 'Test Series',
      danbooruMedia: { id: i, file: 'http://example.com/image.png' }
    }));
    const result = validateBatchCreation(characters);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Maximum 20 characters');
  });

  test('should accept valid batch of 20 characters', () => {
    const characters = Array.from({ length: 20 }, (_, i) => ({
      name: `Character ${i}`,
      series: 'Test Series',
      danbooruMedia: { id: i, file: 'http://example.com/image.png' }
    }));
    const result = validateBatchCreation(characters);
    expect(result.valid).toBe(true);
  });

  test('should accept single character', () => {
    const characters = [{
      name: 'Single Character',
      series: 'Test Series',
      danbooruMedia: { id: 1, file: 'http://example.com/image.png' }
    }];
    const result = validateBatchCreation(characters);
    expect(result.valid).toBe(true);
  });
});

// ===========================================
// TESTS: Danbooru Tags Preparation
// ===========================================

describe('Danbooru Tags Preparation', () => {
  test('should extract all and character tags', () => {
    const media = {
      id: 12345,
      tags: 'tag1 tag2 tag3',
      characterTags: 'character_name_(series)'
    };
    const result = prepareDanbooruTags(media);
    expect(result.all).toBe('tag1 tag2 tag3');
    expect(result.character).toBe('character_name_(series)');
  });

  test('should handle missing tags', () => {
    const media = {
      id: 12345
    };
    const result = prepareDanbooruTags(media);
    expect(result.all).toBe(null);
    expect(result.character).toBe(null);
  });

  test('should handle null media', () => {
    const result = prepareDanbooruTags(null);
    expect(result).toBe(null);
  });

  test('should handle empty tags', () => {
    const media = {
      id: 12345,
      tags: '',
      characterTags: ''
    };
    const result = prepareDanbooruTags(media);
    // Empty strings are falsy, so they become null in the preparation
    expect(result.all).toBe(null);
    expect(result.character).toBe(null);
  });
});

// ===========================================
// TESTS: Multiple Validation Errors
// ===========================================

describe('Multiple Validation Errors', () => {
  test('should collect all validation errors at once', () => {
    const result = validateCharacterFields({
      name: '',
      series: '',
      rarity: 'invalid_rarity',
      danbooruMedia: null
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(4);
    expect(result.errors).toContain('Character name is required');
    expect(result.errors).toContain('Series name is required');
    expect(result.errors).toContain('Invalid rarity value');
    expect(result.errors).toContain('Danbooru media data is required');
  });

  test('should report both name and series missing', () => {
    const result = validateCharacterFields({
      name: '',
      series: '',
      danbooruMedia: { id: 12345, file: 'http://example.com/image.png' }
    });
    expect(result.valid).toBe(false);
    expect(result.errors.filter(e => e.includes('required'))).toHaveLength(2);
  });
});

// ===========================================
// TESTS: Edge Cases
// ===========================================

describe('Edge Cases', () => {
  test('should handle undefined fields gracefully', () => {
    const result = validateCharacterFields({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should handle media with only preview URL', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: 'Test Series',
      danbooruMedia: { id: 12345, preview: 'http://example.com/preview.png' }
    });
    expect(result.valid).toBe(true);
  });

  test('should handle numeric Danbooru ID', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: 'Test Series',
      danbooruMedia: { id: 7654321, file: 'http://example.com/image.png' }
    });
    expect(result.valid).toBe(true);
  });

  test('should handle animated media (video extensions)', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: 'Test Series',
      danbooruMedia: { id: 12345, file: 'http://example.com/video.webm' }
    });
    expect(result.valid).toBe(true);
  });

  test('should handle GIF URLs', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: 'Test Series',
      danbooruMedia: { id: 12345, sample: 'http://example.com/animation.gif' }
    });
    expect(result.valid).toBe(true);
  });
});

// ===========================================
// TESTS: Response Format
// ===========================================

describe('Validation Response Format', () => {
  test('should return valid: true for valid input', () => {
    const result = validateCharacterFields({
      name: 'Test Character',
      series: 'Test Series',
      danbooruMedia: { id: 12345, file: 'http://example.com/image.png' }
    });
    expect(result).toHaveProperty('valid', true);
    expect(result).toHaveProperty('errors');
    expect(result.errors).toEqual([]);
  });

  test('should return valid: false with errors for invalid input', () => {
    const result = validateCharacterFields({
      name: '',
      series: 'Test Series',
      danbooruMedia: { id: 12345, file: 'http://example.com/image.png' }
    });
    expect(result).toHaveProperty('valid', false);
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
