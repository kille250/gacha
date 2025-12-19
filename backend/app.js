require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sequelize = require('./config/db');
const { initUploadDirs, UPLOAD_BASE, isProduction } = require('./config/upload');
const schedule = require('node-schedule');

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
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000'
];

// Add production domains from environment variable
if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);
}
if (process.env.BACKEND_URL) {
  ALLOWED_ORIGINS.push(process.env.BACKEND_URL);
}

// Add Render.com domains if in production
if (isProduction) {
  // Allow any onrender.com subdomain in production
  // You should replace these with your actual Render domains
  ALLOWED_ORIGINS.push(/\.onrender\.com$/);
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
// SECURITY: Rate limiting configuration
// ===========================================

// General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/signup attempts per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for sensitive actions (rolls, redemptions)
const actionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 actions per minute
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===========================================
// MIDDLEWARE
// ===========================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be loaded cross-origin
  contentSecurityPolicy: false, // Disable CSP for now (can configure properly later)
}));

// CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

// Body parsing with size limits
app.use(express.json({ limit: '10kb' })); // Limit JSON body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Apply general rate limiting to all requests
app.use(generalLimiter);

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
// ROUTES with appropriate rate limiting
// ===========================================

// Auth routes with strict rate limiting on login/signup
const authRoutes = require('./routes/auth');
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth', authRoutes);

// Character routes with action rate limiting for rolls
const characterRoutes = require('./routes/characters');
app.use('/api/characters/roll', actionLimiter);
app.use('/api/characters/roll-multi', actionLimiter);
app.use('/api/characters', characterRoutes);

// Admin routes (already protected by auth)
app.use('/api/admin', require('./routes/admin')); 

// Banner routes with action rate limiting for rolls
const bannerRoutes = require('./routes/banners');
app.use('/api/banners/:id/roll', actionLimiter);
app.use('/api/banners/:id/roll-multi', actionLimiter);
app.use('/api/banners', bannerRoutes);

// Coupon routes with action rate limiting
const couponRoutes = require('./routes/coupons');
app.use('/api/coupons/redeem', actionLimiter);
app.use('/api/coupons', couponRoutes);

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
