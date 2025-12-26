require('dotenv').config();
const express = require('express');
const http = require('http');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const sequelize = require('./config/db');
const { initUploadDirs, UPLOAD_BASE, isProduction } = require('./config/upload');
const schedule = require('node-schedule');
const { Server } = require('socket.io');
const { initMultiplayer } = require('./routes/fishingMultiplayer');
const { collectDeviceSignals } = require('./middleware/deviceSignals');
const {
  signupVelocityLimiter,
  burstProtectionLimiter,
  authLimiter,
  rollLimiter,
  fishingLimiter,
  couponLimiter,
  publicReadLimiter
} = require('./middleware/rateLimiter');
const { decayRiskScores } = require('./services/riskService');

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
  allowedHeaders: [
    'Content-Type', 
    'x-auth-token', 
    'Authorization',
    'X-Device-Fingerprint',
    'X-Device-Id',
    // CAPTCHA headers
    'x-recaptcha-token',
    'x-captcha-token',
    'x-captcha-answer'
  ]
};

// ===========================================
// SCHEDULED JOBS
// ===========================================

// Daily bonus: Automatically gives 500 points to ALL users at midnight (UTC)
// This is separate from the manual hourly reward in /api/auth/daily-reward
// Uses batch processing for reliability on large user counts
schedule.scheduleJob('0 0 * * *', async function() {
  console.log('[Scheduled Job] Running daily bonus distribution');
  const bonusAmount = 500;
  const BATCH_SIZE = 100;
  let processedCount = 0;
  let failedCount = 0;

  try {
    // Get total user count first
    const totalUsers = await User.count();
    console.log(`[Scheduled Job] Processing ${totalUsers} users in batches of ${BATCH_SIZE}`);

    // Process users in batches to prevent memory issues and allow partial success
    let offset = 0;
    while (offset < totalUsers) {
      try {
        const users = await User.findAll({
          attributes: ['id'],
          limit: BATCH_SIZE,
          offset: offset
        });

        // Use Promise.allSettled to continue even if some updates fail
        const results = await Promise.allSettled(
          users.map(user => user.increment('points', { by: bonusAmount }))
        );

        results.forEach(result => {
          if (result.status === 'fulfilled') {
            processedCount++;
          } else {
            failedCount++;
            console.error('[Scheduled Job] Failed to give bonus to user:', result.reason?.message);
          }
        });

        offset += BATCH_SIZE;
      } catch (batchErr) {
        console.error(`[Scheduled Job] Batch error at offset ${offset}:`, batchErr.message);
        offset += BATCH_SIZE; // Skip failed batch and continue
        failedCount += BATCH_SIZE;
      }
    }

    console.log(`[Scheduled Job] Daily bonus complete: ${processedCount} succeeded, ${failedCount} failed`);
  } catch (err) {
    console.error('[Scheduled Job] Error distributing daily bonus:', err);
  }
});

// Risk score decay: Reduce risk scores by configurable percentage every 6 hours
// Default 10%, configurable via RISK_SCORE_DECAY_PERCENTAGE in SecurityConfig
schedule.scheduleJob('0 */6 * * *', async function() {
  console.log('[Scheduled Job] Running risk score decay');
  try {
    // Get configurable decay percentage (default 10%)
    const { getNumber } = require('./services/securityConfigService');
    const decayPercentage = await getNumber('RISK_SCORE_DECAY_PERCENTAGE', 0.1);

    const decayedCount = await decayRiskScores(decayPercentage);
    console.log(`[Scheduled Job] Decayed risk scores by ${decayPercentage * 100}% for ${decayedCount} users`);
  } catch (err) {
    console.error('[Scheduled Job] Error decaying risk scores:', err);
  }
});

// Import job processor: Check for pending import jobs every 5 seconds
const { processPendingJobs, cleanupOldJobs } = require('./services/importJobService');
setInterval(async () => {
  try {
    await processPendingJobs();
  } catch (err) {
    console.error('[ImportJob] Error in job processor:', err);
  }
}, 5000);

// Import job cleanup: Remove old completed jobs daily at 3 AM
schedule.scheduleJob('0 3 * * *', async function() {
  console.log('[Scheduled Job] Running import job cleanup');
  try {
    const deleted = await cleanupOldJobs();
    console.log(`[Scheduled Job] Cleaned up ${deleted} old import jobs`);
  } catch (err) {
    console.error('[Scheduled Job] Error cleaning up import jobs:', err);
  }
});

// ===========================================
// MIDDLEWARE (Order matters!)
// ===========================================

// 1. Request ID tracing (for correlating logs across requests)
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// 2. Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// 3. CORS - MUST come before rate limiting to handle preflight
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 4. Body parsing with size limits
// Note: anime-import needs larger limit for bulk character imports (1000+ characters)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 5. Device signal collection (for fingerprinting)
app.use(collectDeviceSignals);

// 6. Burst protection (early rejection of obvious spam)
app.use('/api/', burstProtectionLimiter);

// ===========================================
// RATE LIMITING (Only for specific sensitive routes)
// ===========================================
// NOTE: Rate limiters are now imported from middleware/rateLimiter.js
// They use admin-configurable values from SecurityConfig service:
//   - authLimiter: RATE_LIMIT_AUTH_WINDOW, RATE_LIMIT_AUTH_MAX
//   - rollLimiter: RATE_LIMIT_ROLL_WINDOW, RATE_LIMIT_ROLL_MAX
//   - couponLimiter: RATE_LIMIT_COUPON_WINDOW, RATE_LIMIT_COUPON_MAX
//   - fishingLimiter: RATE_LIMIT_FISHING_WINDOW, RATE_LIMIT_FISHING_MAX
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

// Auth routes - rate limit login/signup/google + signup velocity
const authRoutes = require('./routes/auth');
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter, signupVelocityLimiter);
app.use('/api/auth/google', authLimiter, signupVelocityLimiter); // Also limit Google signups
app.use('/api/auth', authRoutes);

// Appeals routes
app.use('/api/appeals', require('./routes/appeals'));

// Character routes - rate limit roll endpoints + public read protection
const characterRoutes = require('./routes/characters');
app.use('/api/characters/roll', rollLimiter);
app.use('/api/characters/roll-multi', rollLimiter);
app.use('/api/characters/pricing', publicReadLimiter); // Public endpoint protection
app.use('/api/characters', characterRoutes);

// Admin routes
app.use('/api/admin', require('./routes/admin'));

// Anime import routes (admin only)
app.use('/api/anime-import', require('./routes/animeImport'));

// Banner routes - rate limit roll endpoints + public read protection
const bannerRoutes = require('./routes/banners');
app.use('/api/banners/pricing', publicReadLimiter); // Public endpoint protection
app.use('/api/banners', bannerRoutes);

// Coupon routes - rate limit redemption endpoint
app.use('/api/coupons/redeem', couponLimiter);
app.use('/api/coupons', require('./routes/coupons'));

// Fishing minigame routes - rate limit casting
// Uses modular routing from routes/fishing/index.js
app.use('/api/fishing/cast', fishingLimiter);
app.use('/api/fishing', require('./routes/fishing/index'));

// Rarity configuration routes - add public read rate limiting
app.use('/api/rarities', publicReadLimiter, require('./routes/rarities'));

// Dojo (idle game) routes
app.use('/api/dojo', require('./routes/dojo'));

// Game enhancements routes (specializations, breakthroughs, voyages, mastery, etc.)
app.use('/api/enhancements', require('./routes/gameEnhancements'));

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

// ===========================================
// GLOBAL ERROR HANDLER (Must be last middleware)
// Ensures CORS headers are sent even on errors
// ===========================================
app.use((err, req, res, _next) => {
  console.error('[Error Handler]', err.message || err);
  
  // Ensure CORS headers are present on error responses
  const origin = req.headers.origin;
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  // Send appropriate error response
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

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
