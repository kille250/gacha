const { Sequelize } = require('sequelize');

let sequelize;

// Use PostgreSQL in production (Render), SQLite for local development
if (process.env.DATABASE_URL) {
  // Production: PostgreSQL on Render
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
} else {
  // Local development: SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  });
}

module.exports = sequelize;
