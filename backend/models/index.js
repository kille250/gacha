// models/index.js
const User = require('./user');
const Character = require('./character');

// Set up associations
User.belongsToMany(Character, { through: 'UserCharacters' });
Character.belongsToMany(User, { through: 'UserCharacters' });

module.exports = {
  User,
  Character
};