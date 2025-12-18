const path = require('path');
const fs = require('fs');

// Use /var/data for Render's persistent disk, fallback to public/uploads for local dev
const isProduction = process.env.NODE_ENV === 'production';
const UPLOAD_BASE = isProduction ? '/var/data' : path.join(__dirname, '..', 'public/uploads');

// Upload directories
const UPLOAD_DIRS = {
  characters: path.join(UPLOAD_BASE, 'characters'),
  banners: path.join(UPLOAD_BASE, 'banners'),
  videos: path.join(UPLOAD_BASE, 'videos')
};

// Create directories on startup
const initUploadDirs = () => {
  Object.entries(UPLOAD_DIRS).forEach(([name, dir]) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created upload directory: ${name} -> ${dir}`);
    }
  });
};

// Get the URL path for a file (what gets stored in DB and served to frontend)
const getUrlPath = (type, filename) => {
  return `/uploads/${type}/${filename}`;
};

// Get the full filesystem path for a file
const getFilePath = (type, filename) => {
  return path.join(UPLOAD_DIRS[type], filename);
};

module.exports = {
  UPLOAD_BASE,
  UPLOAD_DIRS,
  initUploadDirs,
  getUrlPath,
  getFilePath,
  isProduction
};

