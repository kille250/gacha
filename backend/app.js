require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const { User, Character } = require('./models');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/characters', require('./routes/characters'));
app.use('/api/admin', require('./routes/admin')); // Admin-Routen hinzufügen

// Database sync
sequelize.sync({ force: false }).then(async () => {
  console.log('Database synced');
  
  // Seed sample data
  await Character.bulkCreate([
  ]);

  console.log('Sample characters added');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));