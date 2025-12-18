require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// CORS configuration - allow frontend origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    // Allow all onrender.com subdomains and localhost
    if (origin.includes('onrender.com') || origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(null, true); // Allow all origins for now
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

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests
app.use(express.json());

// Serve static files from public folder
app.use(express.static('public'));

// Serve uploaded files from persistent disk (or local uploads)
// Maps /uploads/* to the correct filesystem location
app.use('/uploads', express.static(UPLOAD_BASE));

console.log(`Serving uploads from: ${UPLOAD_BASE} (production: ${isProduction})`);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uploadPath: UPLOAD_BASE });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/characters', require('./routes/characters'));
app.use('/api/admin', require('./routes/admin')); 
app.use('/api/banners', require('./routes/banners'));
app.use('/api/coupons', require('./routes/coupons'));

const PORT = process.env.PORT || 5000;

// Run migrations and start server
async function startServer() {
  try {
    // First sync basic structure
    await sequelize.sync();
    console.log('Database synced');
    
    // Run migrations for schema changes
    const queryInterface = sequelize.getQueryInterface();
    const Sequelize = require('sequelize');
    
    // Check and add allowR18 column to Users
    const usersTable = await queryInterface.describeTable('Users');
    if (!usersTable.allowR18) {
      await queryInterface.addColumn('Users', 'allowR18', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log('✓ Added allowR18 column to Users');
    } else {
      console.log('✓ allowR18 column already exists');
    }
    
    // Check and add isR18 column to Characters
    const charactersTable = await queryInterface.describeTable('Characters');
    if (!charactersTable.isR18) {
      await queryInterface.addColumn('Characters', 'isR18', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log('✓ Added isR18 column to Characters');
    } else {
      console.log('✓ isR18 column already exists');
    }
    
    console.log('Migrations completed');
    
    // Start server
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
