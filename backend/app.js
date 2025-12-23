require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/db');
const { initUploadDirs, UPLOAD_BASE, isProduction } = require('./config/upload');
const schedule = require('node-schedule');
const { Server } = require('socket.io');
const { initMultiplayer } = require('./routes/fishingMultiplayer');
const { collectDeviceSignals } = require('./middleware/deviceSignals');
const { enforcementMiddleware } = require('./middleware/enforcement');

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

// Import models - triggers association setup in models/index.js
// Only User and Rarity are used directly here; other models are registered for associations
const { User, Rarity } = require('./models');

// Validate fishing configuration on startup
const { validateFishingConfig } = require('./config/fishing/validator');
try {
  validateFishingConfig();
} catch (err) {
  console.error('FATAL ERROR: Fishing configuration is invalid.');
  console.error(err.message);
  if (!isProduction) {
    // Only exit in development - allow production to try to recover
    process.exit(1);
  }
}

// Create upload directories on startup
initUploadDirs();

const app = express();

// ===========================================
// TRUST PROXY (Required for Render.com and other reverse proxies)
// ===========================================
if (isProduction) {
  app.set('trust proxy', 1);
}

// ===========================================
// SECURITY: Allowed origins whitelist
// ===========================================
const ALLOWED_ORIGINS = [
  // Local development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
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

// Shared CORS origin validation (used by Express and Socket.IO)
const validateCorsOrigin = (origin, callback) => {
  // Allow requests with no origin (same-origin requests, mobile apps)
  if (!origin) {
    return callback(null, true);
  }
  
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
};

// CORS configuration - strict origin validation
const corsOptions = {
  origin: validateCorsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization']
};

// ===========================================
// SCHEDULED JOBS
// ===========================================

// Daily bonus: Automatically gives 500 points to ALL users at midnight (UTC)
// This is separate from the manual hourly reward in /api/auth/daily-reward
schedule.scheduleJob('0 0 * * *', async function() {
  console.log('[Scheduled Job] Running daily bonus distribution');
  try {
    const users = await User.findAll();
    const bonusAmount = 500;
    
    for (const user of users) {
      await user.increment('points', { by: bonusAmount });
    }
    
    console.log(`[Scheduled Job] Daily bonus of ${bonusAmount} points given to ${users.length} users`);
  } catch (err) {
    console.error('[Scheduled Job] Error distributing daily bonus:', err);
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

// 4. Device signal collection (for fingerprinting)
app.use(collectDeviceSignals);

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

// Auth routes - rate limit only login/signup/google
const authRoutes = require('./routes/auth');
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/google', authLimiter); // Applies to /google, /google/relink, /google/unlink
app.use('/api/auth', authRoutes);

// Enforcement middleware for protected routes (checks bans, shadowbans, etc.)
// Applied after auth to have user context
const auth = require('./middleware/auth');
app.use('/api/characters', auth, enforcementMiddleware);
app.use('/api/fishing', auth, enforcementMiddleware);
app.use('/api/dojo', auth, enforcementMiddleware);
app.use('/api/banners', auth, enforcementMiddleware);
app.use('/api/coupons', auth, enforcementMiddleware);

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
// Uses modular routing from routes/fishing/index.js
app.use('/api/fishing/cast', fishingLimiter);
app.use('/api/fishing', require('./routes/fishing/index'));

// Rarity configuration routes
app.use('/api/rarities', require('./routes/rarities'));

// Dojo (idle game) routes
app.use('/api/dojo', require('./routes/dojo'));

const PORT = process.env.PORT || 5000;

// Create HTTP server for Express + Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO with CORS (reuses shared validation)
const io = new Server(server, {
  cors: {
    origin: validateCorsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialize fishing multiplayer
initMultiplayer(io);
console.log('[Socket.IO] Fishing multiplayer initialized');

// ===========================================
// DATABASE MIGRATIONS (using sequelize-cli)
// ===========================================

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Run sequelize-cli migrations
async function runMigrations() {
  // Only run migrations for PostgreSQL (production)
  if (!process.env.DATABASE_URL) {
    console.log('[Migration] Skipping migrations (SQLite dev mode)');
    return;
  }
  
  try {
    console.log('[Migration] Running sequelize-cli migrations...');
    const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate', {
      env: { ...process.env, NODE_ENV: 'production' }
    });
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('Executing')) console.error(stderr);
    console.log('[Migration] Migrations completed');
  } catch (err) {
    // Don't fail startup if migrations have issues (they might already be applied)
    console.error('[Migration] Migration error (may be safe to ignore if already applied):', err.message);
  }
}

// Run migrations and start server
async function startServer() {
  try {
    await sequelize.sync();
    console.log('Database synced');
    
    await runMigrations();
    
    // Seed default rarities if none exist
    await Rarity.seedDefaults();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`[Socket.IO] WebSocket server ready`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
