require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const Banner = require('./models/banner');
const Character = require('./models/character');
const User = require('./models/user');
const schedule = require('node-schedule');

// Set up associations after all models are loaded
Banner.belongsToMany(Character, { through: 'BannerCharacters' });
Character.belongsToMany(Banner, { through: 'BannerCharacters' });

// Other associations
User.belongsToMany(Character, { through: 'UserCharacters' });
Character.belongsToMany(User, { through: 'UserCharacters' });

const app = express();

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
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/characters', require('./routes/characters'));
app.use('/api/admin', require('./routes/admin')); 
app.use('/api/banners', require('./routes/banners'));

// Database sync
sequelize.sync({ force: true }).then(async () => {
  console.log('Database synced');
  
  // Seed sample data
  await Character.bulkCreate([
  ]);

  console.log('Sample characters added');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));