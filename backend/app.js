require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sequelize = require('./config/db');
const { initUploadDirs, UPLOAD_BASE, isProduction } = require('./config/upload');
const schedule = require('node-schedule');

// ===========================================
// SECURITY: Validate required environment variables at startup
// ===========================================
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set.');
  console.error('Please set JWT_SECRET before starting the server.');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL ERROR: JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}

// Import all models from index.js (includes associations)
const { User, Character, Coupon, CouponRedemption } = require('./models');
const Banner = require('./models/banner');

// Create upload directories on startup
initUploadDirs();

// Set up Banner associations (not in models/index.js)
Banner.belongsToMany(Character, { through: 'BannerCharacters' });
Character.belongsToMany(Banner, { through: 'BannerCharacters' });

const app = express();

// ===========================================
// SECURITY: Allowed origins whitelist
// ===========================================
const ALLOWED_ORIGINS = [
  // Local development
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  // Production domains
  'https://gacha.solidbooru.online',
  'https://gacha-api-qkqv.onrender.com'
];

// Add additional domains from environment variables
if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);
}
if (process.env.BACKEND_URL) {
  ALLOWED_ORIGINS.push(process.env.BACKEND_URL);
}

// Add Render.com domains if in production
if (isProduction) {
  // Allow any onrender.com subdomain in production
  ALLOWED_ORIGINS.push(/\.onrender\.com$/);
  // Allow solidbooru.online subdomains
  ALLOWED_ORIGINS.push(/\.solidbooru\.online$/);
}

// CORS configuration - strict origin validation
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin requests, mobile apps)
    // In production, you may want to be stricter here
    if (!origin) {
      return callback(null, true);
    }
    
    // Check against whitelist
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization']
};

schedule.scheduleJob('0 0 * * *', async function() {
  console.log('Running daily rewards job');
  try {
    // Get all users
    const users = await User.findAll();
    
    // Fixed reward amount - or you could randomize per user
    const rewardAmount = 500;
    
    // Update each user
    for (const user of users) {
      await user.increment('points', { by: rewardAmount });
      user.lastDailyReward = new Date();
      await user.save();
      console.log(`Daily reward of ${rewardAmount} given to ${user.username}`);
    }
    
    console.log('All daily rewards distributed successfully');
  } catch (err) {
    console.error('Error distributing daily rewards:', err);
  }
});

// ===========================================
// MIDDLEWARE (Order matters!)
// ===========================================

// 1. Security headers first
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// 2. CORS - MUST come before rate limiting to handle preflight
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 3. Body parsing with size limits
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ===========================================
// RATE LIMITING (Only for specific sensitive routes)
// ===========================================

// Strict rate limit for authentication endpoints (login/signup only)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login/signup attempts per 15 minutes
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for gacha rolls (prevent spam rolling)
const rollLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 rolls per minute (very generous)
  message: { error: 'Too many rolls, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for coupon redemption (prevent brute-force guessing)
const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 redemption attempts per 15 minutes
  message: { error: 'Too many coupon redemption attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for fishing (prevent spam casting)
const fishingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 casts per minute
  message: { error: 'Fishing too fast! Wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// NO global rate limiter - only apply to specific sensitive routes

// Serve static files from public folder
app.use(express.static('public'));

// Serve uploaded files from persistent disk (or local uploads)
// Maps /uploads/* to the correct filesystem location
app.use('/uploads', express.static(UPLOAD_BASE));

console.log(`Serving uploads from: ${UPLOAD_BASE} (production: ${isProduction})`);

// Health check endpoint (no sensitive info)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===========================================
// ROUTES
// ===========================================

// Auth routes - rate limit only login/signup
const authRoutes = require('./routes/auth');
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth', authRoutes);

// Character routes - rate limit only roll endpoints
const characterRoutes = require('./routes/characters');
app.use('/api/characters/roll', rollLimiter);
app.use('/api/characters/roll-multi', rollLimiter);
app.use('/api/characters', characterRoutes);

// Admin routes
app.use('/api/admin', require('./routes/admin')); 

// Anime import routes (admin only)
app.use('/api/anime-import', require('./routes/animeImport'));

// Banner routes - rate limit only roll endpoints
const bannerRoutes = require('./routes/banners');
app.use('/api/banners', bannerRoutes);

// Coupon routes - rate limit redemption endpoint
app.use('/api/coupons/redeem', couponLimiter);
app.use('/api/coupons', require('./routes/coupons'));

// Fishing minigame routes - rate limit casting
app.use('/api/fishing/cast', fishingLimiter);
app.use('/api/fishing', require('./routes/fishing'));

const PORT = process.env.PORT || 5000;

// Run migrations and start server
async function startServer() {
  try {
    await sequelize.sync();
    console.log('Database synced');
    
    // Add columns that might be missing (PostgreSQL only)
    if (process.env.DATABASE_URL) {
      async function addColumnIfNotExists(table, column, type, defaultValue) {
        try {
          const [cols] = await sequelize.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name = '${table}' AND column_name = '${column}';`
          );
          if (cols.length === 0) {
            await sequelize.query(
              `ALTER TABLE "${table}" ADD COLUMN "${column}" ${type} DEFAULT ${defaultValue};`
            );
            console.log(`[Migration] Added ${table}.${column}`);
          }
        } catch (err) {
          console.error(`[Migration] Error with ${table}.${column}:`, err.message);
        }
      }
      
      await addColumnIfNotExists('Users', 'allowR18', 'BOOLEAN', 'false');
      await addColumnIfNotExists('Users', 'showR18', 'BOOLEAN', 'false');
      await addColumnIfNotExists('Users', 'autofishEnabled', 'BOOLEAN', 'false');
      await addColumnIfNotExists('Users', 'autofishUnlockedByRank', 'BOOLEAN', 'false');
      await addColumnIfNotExists('Characters', 'isR18', 'BOOLEAN', 'false');
      await addColumnIfNotExists('Banners', 'isR18', 'BOOLEAN', 'false');
    }
    
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
