// routes/animeImport.js - Anime character import from external APIs
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { Character } = require('../models');
const { UPLOAD_DIRS, getUrlPath } = require('../config/upload');

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
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
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

/**
 * Download image/video and save locally - with proper headers for Danbooru
 * Handles redirects and validates downloaded file size
 * @param {string} url - URL to download from
 * @param {string} filename - Local filename to save as
 * @returns {Promise<string>} - Resolves with filepath on success
 */
const downloadImage = (url, filename) => {
  return new Promise((resolve, reject) => {
    const filepath = path.join(UPLOAD_DIRS.characters, filename);
    
    // Parse URL to determine protocol and set proper options
    const parsedUrl = new URL(url);
    
    const buildRequestOptions = (targetUrl) => ({
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'GachaApp/1.0 (Anime Character Import Tool)',
        'Accept': '*/*',
        'Referer': targetUrl.origin
      }
    });
    
    const makeRequest = (currentUrl, redirectCount = 0) => {
      const MAX_REDIRECTS = 5;
      if (redirectCount > MAX_REDIRECTS) {
        reject(new Error('Too many redirects'));
        return;
      }
      
      const targetUrl = new URL(currentUrl);
      const currentProtocol = targetUrl.protocol === 'https:' ? https : http;
      const options = buildRequestOptions(targetUrl);
      
      const req = currentProtocol.request(options, (response) => {
        // Handle redirects (301, 302, 303, 307, 308)
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const redirectUrl = new URL(response.headers.location, currentUrl);
          makeRequest(redirectUrl.href, redirectCount + 1);
          return;
        }
        
        // Check for successful response
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }
        
        // Create write stream only after we have a successful response
        const file = fs.createWriteStream(filepath);
        
        file.on('error', (err) => {
          fs.unlink(filepath, () => {});
          reject(err);
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close(() => {
            // Verify the file was actually downloaded
            fs.stat(filepath, (err, stats) => {
              if (err || stats.size < 1000) {
                fs.unlink(filepath, () => {});
                reject(new Error('Downloaded file is too small or corrupted'));
              } else {
                console.log(`Downloaded ${filename}: ${stats.size} bytes`);
                resolve(filepath);
              }
            });
          });
        });
      });
      
      req.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
      
      req.end();
    };
    
    makeRequest(url);
  });
};

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
    
    for (const char of characters) {
      try {
        if (!char.name || !char.image) {
          errors.push({ name: char.name || 'Unknown', error: 'Missing name or image' });
          continue;
        }
        
        // Check if character already exists (by name and series)
        const existing = await Character.findOne({
          where: { name: char.name, series: series.trim() }
        });
        
        if (existing) {
          errors.push({ name: char.name, error: 'Character already exists in this series' });
          continue;
        }
        
        // Download the image
        const ext = path.extname(new URL(char.image).pathname) || '.jpg';
        const filename = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
        
        await downloadImage(char.image, filename);
        const imagePath = getUrlPath('characters', filename);
        
        // Create the character
        const newCharacter = await Character.create({
          name: char.name,
          image: imagePath,
          series: series.trim(),
          rarity: char.rarity || rarity,
          isR18: false
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
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
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
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
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
      .filter(post => post.file_url || post.large_file_url) // Must have file URL
      .map(post => {
        const ext = (post.file_ext || '').toLowerCase();
        const isAnimated = ext === 'webm' || ext === 'mp4' || ext === 'gif' || ext === 'zip';
        return {
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
          isAnimated
        };
      })
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
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
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
      .filter(post => {
        const ext = (post.file_ext || '').toLowerCase();
        return ext === 'webm' || ext === 'mp4' || ext === 'gif' || ext === 'zip';
      })
      .filter(post => post.file_url)
      .map(post => ({
        id: post.id,
        preview: post.preview_file_url || post.large_file_url,
        sample: post.large_file_url || post.file_url,
        file: post.file_url,
        fileExt: post.file_ext,
        tags: post.tag_string,
        source: post.source,
        width: post.image_width,
        height: post.image_height,
        score: post.score,
        characterTags: post.tag_string_character
      }));
    
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
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    
    // Convert to Danbooru format
    const searchTerm = q.toLowerCase().replace(/\s+/g, '_');
    
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
      .map(post => {
        const ext = (post.file_ext || '').toLowerCase();
        const isAnimated = ext === 'webm' || ext === 'mp4' || ext === 'gif' || ext === 'zip' || 
                          (post.tag_string && post.tag_string.includes('animated'));
        return {
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
          favorites: post.fav_count,
          characterTags: post.tag_string_character,
          isAnimated
        };
      });
    
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
