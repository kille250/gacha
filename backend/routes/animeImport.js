// routes/animeImport.js - Anime character import from external APIs
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
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

// Download image and save locally
const downloadImage = (url, filename) => {
  return new Promise((resolve, reject) => {
    const filepath = path.join(UPLOAD_DIRS.characters, filename);
    const file = fs.createWriteStream(filepath);
    
    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(filepath);
          });
        }).on('error', (err) => {
          fs.unlink(filepath, () => {});
          reject(err);
        });
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    });
    
    request.on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
    
    file.on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
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

// Headers for Danbooru API
const DANBOORU_HEADERS = {
  'User-Agent': 'GachaApp/1.0 (Anime Character Import Tool)',
  'Accept': 'application/json'
};

// Helper to convert search query to Danbooru tag format
const toDanbooruTag = (query) => {
  // Danbooru uses underscores for spaces, lowercase
  return query.trim().toLowerCase().replace(/\s+/g, '_');
};

// Search Danbooru for animated content (GIFs, videos)
router.get('/search-sakuga', auth, adminAuth, async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const tag = toDanbooruTag(q);
    const limit = 20;
    // Search for animated content with safe rating
    const searchUrl = `${DANBOORU_API}/posts.json?tags=${encodeURIComponent(tag)}+animated+rating:general&limit=${limit}&page=${page}`;
    
    const response = await fetch(searchUrl, { headers: DANBOORU_HEADERS });
    if (!response.ok) {
      throw new Error(`Danbooru API error: ${response.status}`);
    }
    
    const posts = await response.json();
    
    // Filter and map to simpler format, only include video/gif files
    const results = posts
      .filter(post => {
        const ext = (post.file_ext || '').toLowerCase();
        return ext === 'webm' || ext === 'mp4' || ext === 'gif' || ext === 'zip'; // zip = ugoira
      })
      .filter(post => post.file_url) // Must have file URL
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
    const searchUrl = `${DANBOORU_API}/posts.json?tags=${encodeURIComponent(tag)}+animated+rating:general&limit=${limit}&page=${page}`;
    
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

// Get suggested tags from Danbooru
router.get('/sakuga-tags', auth, adminAuth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    
    const searchUrl = `${DANBOORU_API}/tags.json?search[name_matches]=${encodeURIComponent(q)}*&search[order]=count&limit=10`;
    
    const response = await fetch(searchUrl, { headers: DANBOORU_HEADERS });
    if (!response.ok) {
      throw new Error(`Danbooru tag API error: ${response.status}`);
    }
    
    const tags = await response.json();
    
    const results = tags.map(tag => ({
      name: tag.name,
      count: tag.post_count,
      type: tag.category // 0=general, 1=artist, 3=copyright, 4=character
    }));
    
    res.json({ tags: results });
  } catch (err) {
    console.error('Danbooru tag search error:', err);
    res.status(500).json({ error: err.message || 'Failed to search tags' });
  }
});

module.exports = router;

