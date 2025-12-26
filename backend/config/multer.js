/**
 * Centralized Multer Configuration
 * 
 * Shared upload handling for admin.js and banners.js
 * Reduces code duplication and ensures consistent file handling
 */

const multer = require('multer');
const path = require('path');
const { UPLOAD_DIRS } = require('./upload');

// ===========================================
// CHARACTER UPLOAD (admin.js)
// ===========================================

const characterStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, UPLOAD_DIRS.characters);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// ===========================================
// BANNER UPLOAD (banners.js)
// ===========================================

const bannerStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = file.mimetype.startsWith('video/') 
      ? UPLOAD_DIRS.videos 
      : UPLOAD_DIRS.banners;
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// ===========================================
// FILE FILTERS
// ===========================================

/**
 * Filter for images and videos (MP4, WebM)
 * Used by character uploads
 */
const imageVideoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || 
      file.mimetype === 'video/mp4' || 
      file.mimetype === 'video/webm') {
    cb(null, true);
  } else {
    cb(new Error('Only images or videos (MP4, WebM) are allowed'), false);
  }
};

/**
 * Filter for images and all video types
 * Used by banner uploads
 */
const mediaFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed'), false);
  }
};

// ===========================================
// CONFIGURED UPLOAD INSTANCES
// ===========================================

/**
 * Character upload instance (25 MB limit)
 * Used in admin.js for character management
 * Reduced from 100MB to prevent disk exhaustion attacks
 */
const characterUpload = multer({
  storage: characterStorage,
  fileFilter: imageVideoFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB (reduced from 100 MB)
  }
});

/**
 * Banner upload instance (25 MB limit)
 * Used in banners.js for banner management
 * Reduced from 50MB for consistency
 */
const bannerUpload = multer({
  storage: bannerStorage,
  fileFilter: mediaFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB (reduced from 50 MB)
  }
});

module.exports = {
  characterUpload,
  bannerUpload,
  // Export individual components for custom configurations if needed
  characterStorage,
  bannerStorage,
  imageVideoFilter,
  mediaFilter
};