// routes/animeImport.js - Anime character import from external APIs
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { Character } = require('../models');
const { getUrlPath, getFilePath } = require('../config/upload');
const { downloadImage, generateUniqueFilename, getExtensionFromUrl, safeUnlink } = require('../utils/fileUtils');
const { checkForDuplicates, getDetectionMode } = require('../services/duplicateDetectionService');
const { logAdminAction: logDuplicateEvent } = require('../services/auditService');

// Jikan API base URL (free MyAnimeList API)
const JIKAN_API = 'https://api.jikan.moe/v4';

// Rate limiting helper - Jikan has a 3 req/sec limit
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 350; // 350ms between requests

const rateLimitedFetch = async (url) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }
  return response.json();
};

// Search for anime series
router.get('/search-anime', auth, adminAuth, async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    
    const validation = validateSearchQuery(q);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const searchUrl = `${JIKAN_API}/anime?q=${encodeURIComponent(q)}&page=${page}&limit=10&sfw=true`;
    const data = await rateLimitedFetch(searchUrl);
    
    // Map to simpler format
    const results = data.data.map(anime => ({
      mal_id: anime.mal_id,
      title: anime.title,
      title_english: anime.title_english,
      title_japanese: anime.title_japanese,
      image: anime.images?.jpg?.image_url || anime.images?.webp?.image_url,
      synopsis: anime.synopsis ? anime.synopsis.substring(0, 200) + '...' : null,
      score: anime.score,
      episodes: anime.episodes,
      status: anime.status,
      year: anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null)
    }));
    
    res.json({
      results,
      pagination: data.pagination
    });
  } catch (err) {
    console.error('Anime search error:', err);
    res.status(500).json({ error: err.message || 'Failed to search anime' });
  }
});

// Get characters for a specific anime
router.get('/anime/:mal_id/characters', auth, adminAuth, async (req, res) => {
  try {
    const { mal_id } = req.params;
    
    if (!mal_id || isNaN(mal_id)) {
      return res.status(400).json({ error: 'Valid anime ID required' });
    }
    
    const charactersUrl = `${JIKAN_API}/anime/${mal_id}/characters`;
    const data = await rateLimitedFetch(charactersUrl);
    
    // Map to simpler format and filter to main/supporting characters only
    const characters = data.data
      .filter(char => char.role === 'Main' || char.role === 'Supporting')
      .map(char => ({
        mal_id: char.character.mal_id,
        name: char.character.name,
        image: char.character.images?.jpg?.image_url || char.character.images?.webp?.image_url,
        role: char.role
      }));
    
    res.json({ characters });
  } catch (err) {
    console.error('Fetch characters error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch characters' });
  }
});

// Get details for a specific character
router.get('/character/:mal_id', auth, adminAuth, async (req, res) => {
  try {
    const { mal_id } = req.params;
    
    if (!mal_id || isNaN(mal_id)) {
      return res.status(400).json({ error: 'Valid character ID required' });
    }
    
    const characterUrl = `${JIKAN_API}/characters/${mal_id}/full`;
    const data = await rateLimitedFetch(characterUrl);
    
    const char = data.data;
    res.json({
      mal_id: char.mal_id,
      name: char.name,
      name_kanji: char.name_kanji,
      nicknames: char.nicknames,
      image: char.images?.jpg?.image_url || char.images?.webp?.image_url,
      about: char.about ? char.about.substring(0, 500) : null,
      favorites: char.favorites
    });
  } catch (err) {
    console.error('Fetch character details error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch character details' });
  }
});

// Import selected characters
router.post('/import', auth, adminAuth, async (req, res) => {
  try {
    const { characters, series, rarity = 'common' } = req.body;

    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return res.status(400).json({ error: 'No characters selected for import' });
    }

    if (!series || !series.trim()) {
      return res.status(400).json({ error: 'Series name is required' });
    }

    // Validate rarity
    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (!validRarities.includes(rarity)) {
      return res.status(400).json({ error: 'Invalid rarity value' });
    }

    const createdCharacters = [];
    const errors = [];
    const detectionMode = getDetectionMode();

    for (const char of characters) {
      try {
        if (!char.name || !char.image) {
          errors.push({ name: char.name || 'Unknown', error: 'Missing name or image' });
          continue;
        }

        // Download the image first (needed for fingerprinting)
        const ext = getExtensionFromUrl(char.image);
        const filename = generateUniqueFilename('imported', ext);

        await downloadImage(char.image, filename, 'characters', { minFileSize: 1000 });
        const filePath = getFilePath('characters', filename);
        const imagePath = getUrlPath('characters', filename);

        // Check for duplicates using image fingerprinting
        const duplicateCheck = await checkForDuplicates(filePath);

        if (duplicateCheck.action === 'reject') {
          safeUnlink(filePath);
          errors.push({
            name: char.name,
            error: duplicateCheck.reason,
            duplicateOf: duplicateCheck.exactMatch?.name || duplicateCheck.similarMatches[0]?.name
          });
          continue;
        }

        // Log warnings for audit trail
        if (duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag') {
          await logDuplicateEvent('character.duplicate_warning', req.user.id, null, {
            action: duplicateCheck.action,
            reason: duplicateCheck.reason,
            matches: duplicateCheck.similarMatches,
            filename: filename,
            detectionMode,
            importSource: 'anime-import'
          }, req);
        }

        // Create the character with fingerprints
        const fp = duplicateCheck.fingerprints;
        const newCharacter = await Character.create({
          name: char.name,
          image: imagePath,
          series: series.trim(),
          rarity: char.rarity || rarity,
          isR18: false,
          sha256Hash: fp?.sha256 || null,
          dHash: fp?.dHash || null,
          aHash: fp?.aHash || null,
          duplicateWarning: duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag',
          // Video fingerprint fields (for Danbooru animated content)
          mediaType: fp?.mediaType || 'image',
          frameHashes: fp?.frameHashes || null,
          representativeDHash: fp?.representativeDHash || null,
          representativeAHash: fp?.representativeAHash || null,
          duration: fp?.duration || null,
          frameCount: fp?.frameCount || null
        });

        createdCharacters.push(newCharacter);

        // Small delay to avoid overwhelming the image server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (charErr) {
        console.error(`Error importing character ${char.name}:`, charErr);
        errors.push({ name: char.name, error: charErr.message });
      }
    }

    console.log(`Admin (ID: ${req.user.id}) imported ${createdCharacters.length} characters from "${series}" (${errors.length} errors)`);

    res.json({
      message: `Successfully imported ${createdCharacters.length} characters`,
      characters: createdCharacters,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message || 'Failed to import characters' });
  }
});

// Search for characters directly
router.get('/search-characters', auth, adminAuth, async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    
    const validation = validateSearchQuery(q);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const searchUrl = `${JIKAN_API}/characters?q=${encodeURIComponent(q)}&page=${page}&limit=15`;
    const data = await rateLimitedFetch(searchUrl);
    
    // Map to simpler format
    const results = data.data.map(char => ({
      mal_id: char.mal_id,
      name: char.name,
      name_kanji: char.name_kanji,
      image: char.images?.jpg?.image_url || char.images?.webp?.image_url,
      favorites: char.favorites
    }));
    
    res.json({
      results,
      pagination: data.pagination
    });
  } catch (err) {
    console.error('Character search error:', err);
    res.status(500).json({ error: err.message || 'Failed to search characters' });
  }
});

// ==========================================
// DANBOORU VIDEO/GIF SEARCH (Animated Content)
// ==========================================
const DANBOORU_API = 'https://danbooru.donmai.us';

// Danbooru API credentials (optional, from environment)
const DANBOORU_LOGIN = process.env.DANBOORU_LOGIN || '';
const DANBOORU_API_KEY = process.env.DANBOORU_API_KEY || '';

// Headers for Danbooru API
const DANBOORU_HEADERS = {
  'User-Agent': 'GachaApp/1.0 (Anime Character Import Tool)',
  'Accept': 'application/json'
};

// Animated file extensions
const ANIMATED_EXTENSIONS = ['webm', 'mp4', 'gif', 'zip'];

/**
 * Check if a file extension indicates animated content
 * @param {string} ext - File extension (without dot)
 * @returns {boolean} - True if animated
 */
const isAnimatedExtension = (ext) => {
  return ANIMATED_EXTENSIONS.includes((ext || '').toLowerCase());
};

/**
 * Validate search query length
 * @param {string} query - Search query
 * @param {number} minLength - Minimum required length (default: 2)
 * @returns {{ valid: boolean, error?: string }} - Validation result
 */
const validateSearchQuery = (query, minLength = 2) => {
  if (!query || query.trim().length < minLength) {
    return { valid: false, error: `Search query must be at least ${minLength} characters` };
  }
  return { valid: true };
};

/**
 * Map Danbooru post to simplified result format
 * @param {Object} post - Raw Danbooru post object
 * @param {boolean} includeAnimatedFlag - Whether to include isAnimated flag
 * @returns {Object} - Simplified post object
 */
const mapDanbooruPost = (post, includeAnimatedFlag = true) => {
  const result = {
    id: post.id,
    preview: post.preview_file_url || post.large_file_url,
    sample: post.large_file_url || post.file_url,
    file: post.file_url || post.large_file_url,
    fileExt: post.file_ext,
    tags: post.tag_string,
    source: post.source,
    width: post.image_width,
    height: post.image_height,
    score: post.score,
    characterTags: post.tag_string_character,
    copyrightTags: post.tag_string_copyright,
    artistTags: post.tag_string_artist
  };
  
  if (includeAnimatedFlag) {
    result.isAnimated = isAnimatedExtension(post.file_ext) || 
                        (post.tag_string && post.tag_string.includes('animated'));
  }
  
  return result;
};

// Helper to add auth params to Danbooru URL
const addDanbooruAuth = (url) => {
  if (DANBOORU_LOGIN && DANBOORU_API_KEY) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}login=${encodeURIComponent(DANBOORU_LOGIN)}&api_key=${encodeURIComponent(DANBOORU_API_KEY)}`;
  }
  return url;
};

// Helper to convert search query to Danbooru tag format
const toDanbooruTag = (query) => {
  // Danbooru uses underscores for spaces, lowercase
  return query.trim().toLowerCase().replace(/\s+/g, '_');
};

// Search Danbooru for animated content (GIFs, videos) - with fallback to images
router.get('/search-sakuga', auth, adminAuth, async (req, res) => {
  try {
    const { q, page = 1, animated = 'true' } = req.query;
    
    const validation = validateSearchQuery(q);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const tag = toDanbooruTag(q);
    const limit = 20;
    
    // First try: search for animated content with safe rating
    const animatedTags = `${tag} animated -rating:explicit -rating:questionable`;
    let searchUrl = addDanbooruAuth(`${DANBOORU_API}/posts.json?tags=${encodeURIComponent(animatedTags)}&limit=${limit}&page=${page}`);
    
    let response = await fetch(searchUrl, { headers: DANBOORU_HEADERS });
    if (!response.ok) {
      throw new Error(`Danbooru API error: ${response.status}`);
    }
    
    let posts = await response.json();
    
    // If no animated results, fallback to regular images
    if (posts.length === 0 && animated !== 'false') {
      const fallbackTags = `${tag} -rating:explicit -rating:questionable`;
      searchUrl = addDanbooruAuth(`${DANBOORU_API}/posts.json?tags=${encodeURIComponent(fallbackTags)}&limit=${limit}&page=${page}`);
      response = await fetch(searchUrl, { headers: DANBOORU_HEADERS });
      if (response.ok) {
        posts = await response.json();
      }
    }
    
    // Filter and map - prefer animated but include high-quality images as fallback
    const results = posts
      .filter(post => post.file_url || post.large_file_url)
      .map(post => mapDanbooruPost(post, true))
      // Sort: animated content first, then by score
      .sort((a, b) => {
        if (a.isAnimated && !b.isAnimated) return -1;
        if (!a.isAnimated && b.isAnimated) return 1;
        return (b.score || 0) - (a.score || 0);
      });
    
    res.json({
      results,
      query: tag,
      page: parseInt(page),
      hasMore: posts.length === limit
    });
  } catch (err) {
    console.error('Danbooru search error:', err);
    res.status(500).json({ error: err.message || 'Failed to search Danbooru' });
  }
});

// Search Danbooru by anime series name
router.get('/search-sakuga-anime', auth, adminAuth, async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    
    const validation = validateSearchQuery(q);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const tag = toDanbooruTag(q);
    const limit = 30;
    // Search with animated tag and safe rating
    const tagsQuery = `${tag} animated -rating:explicit -rating:questionable`;
    const searchUrl = addDanbooruAuth(`${DANBOORU_API}/posts.json?tags=${encodeURIComponent(tagsQuery)}&limit=${limit}&page=${page}`);
    
    const response = await fetch(searchUrl, { headers: DANBOORU_HEADERS });
    if (!response.ok) {
      throw new Error(`Danbooru API error: ${response.status}`);
    }
    
    const posts = await response.json();
    
    // Filter to video/gif files only and map
    const results = posts
      .filter(post => isAnimatedExtension(post.file_ext) && post.file_url)
      .map(post => mapDanbooruPost(post, false));
    
    res.json({
      results,
      query: tag,
      page: parseInt(page),
      hasMore: posts.length === limit
    });
  } catch (err) {
    console.error('Danbooru anime search error:', err);
    res.status(500).json({ error: err.message || 'Failed to search Danbooru' });
  }
});

// Get suggested tags from Danbooru - with character tag priority
router.get('/sakuga-tags', auth, adminAuth, async (req, res) => {
  try {
    const { q, category } = req.query;
    
    const validation = validateSearchQuery(q);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Convert to Danbooru format
    const searchTerm = toDanbooruTag(q);
    
    // Build search URL - optionally filter by category (4 = character)
    let searchUrl = `${DANBOORU_API}/tags.json?search[name_matches]=*${encodeURIComponent(searchTerm)}*&search[order]=count&limit=20`;
    if (category) {
      searchUrl += `&search[category]=${category}`;
    }
    
    // Add auth
    searchUrl = addDanbooruAuth(searchUrl);
    
    const response = await fetch(searchUrl, { headers: DANBOORU_HEADERS });
    if (!response.ok) {
      throw new Error(`Danbooru tag API error: ${response.status}`);
    }
    
    const tags = await response.json();
    
    // Map and sort: character tags (4) first, then by post count
    const results = tags
      .map(tag => ({
        name: tag.name,
        displayName: tag.name.replace(/_/g, ' '),
        count: tag.post_count,
        category: tag.category // 0=general, 1=artist, 3=copyright/series, 4=character
      }))
      .sort((a, b) => {
        // Characters first
        if (a.category === 4 && b.category !== 4) return -1;
        if (a.category !== 4 && b.category === 4) return 1;
        // Then copyright/series
        if (a.category === 3 && b.category !== 3) return -1;
        if (a.category !== 3 && b.category === 3) return 1;
        // Then by count
        return b.count - a.count;
      });
    
    res.json({ tags: results });
  } catch (err) {
    console.error('Danbooru tag search error:', err);
    res.status(500).json({ error: err.message || 'Failed to search tags' });
  }
});

// ==========================================
// CREATE CHARACTER FROM DANBOORU IMAGE
// ==========================================

/**
 * Create a new character from a Danbooru image
 * Reuses existing Danbooru search results - expects the Danbooru media object
 * as input rather than re-fetching from Danbooru.
 */
router.post('/create-from-danbooru', auth, adminAuth, async (req, res) => {
  try {
    const { name, series, rarity = 'common', isR18 = false, danbooruMedia } = req.body;

    // Validate required character fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Character name is required' });
    }
    if (!series || !series.trim()) {
      return res.status(400).json({ error: 'Series name is required' });
    }

    // Validate rarity
    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (!validRarities.includes(rarity)) {
      return res.status(400).json({ error: 'Invalid rarity value' });
    }

    // Validate Danbooru media object
    if (!danbooruMedia || !danbooruMedia.id) {
      return res.status(400).json({ error: 'Danbooru media data is required' });
    }

    // Get the best available image URL (prefer sample/large over full for faster loading)
    const imageUrl = danbooruMedia.sample || danbooruMedia.file || danbooruMedia.preview;
    if (!imageUrl) {
      return res.status(400).json({ error: 'No valid image URL in Danbooru media data' });
    }

    // Check if character already exists from this Danbooru post
    const existingFromDanbooru = await Character.findOne({
      where: { danbooruPostId: danbooruMedia.id }
    });
    if (existingFromDanbooru) {
      return res.status(409).json({
        error: 'A character already exists from this Danbooru post',
        existingCharacter: {
          id: existingFromDanbooru.id,
          name: existingFromDanbooru.name,
          series: existingFromDanbooru.series,
          image: existingFromDanbooru.image
        }
      });
    }

    // Download the image
    const ext = getExtensionFromUrl(imageUrl);
    const filename = generateUniqueFilename('danbooru', ext);

    await downloadImage(imageUrl, filename, 'characters', { minFileSize: 1000 });
    const filePath = getFilePath('characters', filename);
    const imagePath = getUrlPath('characters', filename);

    // Check for duplicates using image fingerprinting
    const duplicateCheck = await checkForDuplicates(filePath);
    const detectionMode = getDetectionMode();

    if (duplicateCheck.action === 'reject') {
      safeUnlink(filePath);
      const existingMatch = duplicateCheck.exactMatch || duplicateCheck.similarMatches[0];
      return res.status(409).json({
        error: duplicateCheck.reason,
        status: 'confirmed_duplicate',
        explanation: duplicateCheck.reason,
        similarity: existingMatch?.similarity || (duplicateCheck.isExactDuplicate ? 100 : null),
        suggestedActions: ['change_media', 'cancel'],
        existingMatch: existingMatch ? {
          id: existingMatch.id,
          name: existingMatch.name,
          series: existingMatch.series,
          image: existingMatch.image,
          thumbnailUrl: existingMatch.image,
          mediaType: existingMatch.mediaType || 'image',
          similarity: existingMatch.similarity
        } : null
      });
    }

    // Log warnings for audit trail
    if (duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag') {
      await logDuplicateEvent('character.duplicate_warning', req.user.id, null, {
        action: duplicateCheck.action,
        reason: duplicateCheck.reason,
        matches: duplicateCheck.similarMatches,
        filename: filename,
        detectionMode,
        importSource: 'danbooru-create'
      }, req);
    }

    // Prepare Danbooru tags for storage
    const danbooruTags = {
      all: danbooruMedia.tags || null,
      character: danbooruMedia.characterTags || null
    };

    // Create the character with fingerprints and Danbooru metadata
    const fp = duplicateCheck.fingerprints;
    const newCharacter = await Character.create({
      name: name.trim(),
      image: imagePath,
      series: series.trim(),
      rarity,
      isR18: isR18 === true || isR18 === 'true',
      // Fingerprints
      sha256Hash: fp?.sha256 || null,
      dHash: fp?.dHash || null,
      aHash: fp?.aHash || null,
      duplicateWarning: duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag',
      // Video fingerprint fields
      mediaType: fp?.mediaType || 'image',
      frameHashes: fp?.frameHashes || null,
      representativeDHash: fp?.representativeDHash || null,
      representativeAHash: fp?.representativeAHash || null,
      duration: fp?.duration || null,
      frameCount: fp?.frameCount || null,
      // Danbooru metadata
      danbooruPostId: danbooruMedia.id,
      danbooruSourceUrl: danbooruMedia.source || null,
      danbooruTags: danbooruTags
    });

    console.log(`Admin (ID: ${req.user.id}) created character "${name}" from Danbooru post ${danbooruMedia.id}`);

    const response = {
      message: 'Character created successfully from Danbooru',
      character: newCharacter
    };

    // Include warning in response if flagged
    if (duplicateCheck.action === 'flag') {
      response.warning = duplicateCheck.reason;
      response.similarCharacters = duplicateCheck.similarMatches;
    }

    res.status(201).json(response);
  } catch (err) {
    console.error('Error creating character from Danbooru:', err);
    res.status(500).json({ error: err.message || 'Failed to create character from Danbooru' });
  }
});

/**
 * Batch create characters from multiple Danbooru images
 * For efficient bulk imports from Danbooru search results
 */
router.post('/create-from-danbooru-batch', auth, adminAuth, async (req, res) => {
  try {
    const { characters } = req.body;

    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return res.status(400).json({ error: 'No characters provided for creation' });
    }

    if (characters.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 characters per batch' });
    }

    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const createdCharacters = [];
    const errors = [];
    const detectionMode = getDetectionMode();

    for (let i = 0; i < characters.length; i++) {
      const charData = characters[i];

      try {
        // Validate required fields
        if (!charData.name?.trim()) {
          errors.push({ index: i, error: 'Character name is required' });
          continue;
        }
        if (!charData.series?.trim()) {
          errors.push({ index: i, error: 'Series name is required' });
          continue;
        }
        if (!charData.danbooruMedia?.id) {
          errors.push({ index: i, error: 'Danbooru media data is required' });
          continue;
        }

        const rarity = validRarities.includes(charData.rarity) ? charData.rarity : 'common';
        const danbooruMedia = charData.danbooruMedia;

        // Check if already exists from this Danbooru post
        const existingFromDanbooru = await Character.findOne({
          where: { danbooruPostId: danbooruMedia.id }
        });
        if (existingFromDanbooru) {
          errors.push({
            index: i,
            name: charData.name,
            error: 'Character already exists from this Danbooru post',
            existingId: existingFromDanbooru.id
          });
          continue;
        }

        // Get image URL
        const imageUrl = danbooruMedia.sample || danbooruMedia.file || danbooruMedia.preview;
        if (!imageUrl) {
          errors.push({ index: i, name: charData.name, error: 'No valid image URL' });
          continue;
        }

        // Download and fingerprint
        const ext = getExtensionFromUrl(imageUrl);
        const filename = generateUniqueFilename('danbooru', ext);

        await downloadImage(imageUrl, filename, 'characters', { minFileSize: 1000 });
        const filePath = getFilePath('characters', filename);
        const imagePath = getUrlPath('characters', filename);

        // Check for duplicates
        const duplicateCheck = await checkForDuplicates(filePath);

        if (duplicateCheck.action === 'reject') {
          safeUnlink(filePath);
          const existingMatch = duplicateCheck.exactMatch || duplicateCheck.similarMatches[0];
          errors.push({
            index: i,
            name: charData.name,
            error: duplicateCheck.reason,
            duplicateOf: existingMatch?.name
          });
          continue;
        }

        // Log warnings
        if (duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag') {
          await logDuplicateEvent('character.duplicate_warning', req.user.id, null, {
            action: duplicateCheck.action,
            reason: duplicateCheck.reason,
            matches: duplicateCheck.similarMatches,
            filename,
            detectionMode,
            importSource: 'danbooru-batch'
          }, req);
        }

        // Prepare tags
        const danbooruTags = {
          all: danbooruMedia.tags || null,
          character: danbooruMedia.characterTags || null
        };

        // Create character
        const fp = duplicateCheck.fingerprints;
        const newCharacter = await Character.create({
          name: charData.name.trim(),
          image: imagePath,
          series: charData.series.trim(),
          rarity,
          isR18: charData.isR18 === true || charData.isR18 === 'true',
          sha256Hash: fp?.sha256 || null,
          dHash: fp?.dHash || null,
          aHash: fp?.aHash || null,
          duplicateWarning: duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag',
          mediaType: fp?.mediaType || 'image',
          frameHashes: fp?.frameHashes || null,
          representativeDHash: fp?.representativeDHash || null,
          representativeAHash: fp?.representativeAHash || null,
          duration: fp?.duration || null,
          frameCount: fp?.frameCount || null,
          danbooruPostId: danbooruMedia.id,
          danbooruSourceUrl: danbooruMedia.source || null,
          danbooruTags: danbooruTags
        });

        createdCharacters.push(newCharacter);

        // Small delay to avoid overwhelming external servers
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (charErr) {
        console.error(`Error creating character at index ${i}:`, charErr);
        errors.push({ index: i, name: charData.name, error: charErr.message });
      }
    }

    console.log(`Admin (ID: ${req.user.id}) batch created ${createdCharacters.length} characters from Danbooru (${errors.length} errors)`);

    res.status(201).json({
      message: `Successfully created ${createdCharacters.length} characters from Danbooru`,
      characters: createdCharacters,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Batch create from Danbooru error:', err);
    res.status(500).json({ error: err.message || 'Failed to batch create characters from Danbooru' });
  }
});

// Search Danbooru with exact tag and sorting options
router.get('/search-danbooru-tag', auth, adminAuth, async (req, res) => {
  try {
    const { tag, page = 1, sort = 'score', extraTags = '', typeFilter = 'all' } = req.query;
    
    if (!tag || tag.trim().length < 1) {
      return res.status(400).json({ error: 'Tag is required' });
    }
    
    const limit = 40; // Fetch more to compensate for client-side filtering
    // Sort options: score, favcount, id (newest)
    const orderTag = sort === 'newest' ? 'order:id_desc' : sort === 'favorites' ? 'order:favcount' : 'order:score';
    
    // Build tags array for proper encoding
    const tagsList = [tag];
    
    // Add extra tags if provided (convert spaces to underscores for each tag)
    if (extraTags.trim()) {
      const extraTagsArr = extraTags.trim().split(/[\s,]+/).filter(t => t.length > 0);
      for (const et of extraTagsArr) {
        tagsList.push(et.toLowerCase().replace(/\s+/g, '_'));
      }
    }
    
    // Add type filter tag (only for animated - static uses client-side filter)
    if (typeFilter === 'animated') {
      tagsList.push('animated');
    }
    // Note: For 'static', we filter client-side because -animated negation can cause API issues
    
    // Add safe rating filter (exclude explicit and questionable)
    tagsList.push('-rating:explicit');
    tagsList.push('-rating:questionable');
    
    // Add sorting
    tagsList.push(orderTag);
    
    // Build URL with space-separated tags (Danbooru uses spaces, URL encodes them)
    const tagsQuery = tagsList.join(' ');
    let searchUrl = `${DANBOORU_API}/posts.json?tags=${encodeURIComponent(tagsQuery)}&limit=${limit}&page=${page}`;
    
    // Add authentication if configured
    searchUrl = addDanbooruAuth(searchUrl);
    
    const response = await fetch(searchUrl, { headers: DANBOORU_HEADERS });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Danbooru API error:', response.status, errorText);
      throw new Error(`Danbooru API error: ${response.status}`);
    }
    
    const posts = await response.json();
    
    let results = posts
      .filter(post => post.file_url || post.large_file_url)
      .map(post => ({
        ...mapDanbooruPost(post, true),
        favorites: post.fav_count
      }));
    
    // Client-side filter for static (since -animated tag can cause API issues)
    if (typeFilter === 'static') {
      results = results.filter(r => !r.isAnimated);
    }
    
    res.json({
      results,
      tag,
      page: parseInt(page),
      hasMore: posts.length === limit
    });
  } catch (err) {
    console.error('Danbooru tag search error:', err);
    res.status(500).json({ error: err.message || 'Failed to search Danbooru' });
  }
});

module.exports = router;
