const { Sequelize } = require('sequelize');
const path = require('path');

// --- Teacher's Note: Smart Database Detection ---
// This code automatically detects if you're using a local file (SQLite)
// or a professional cloud database (PostgreSQL from Neon/Render).
const databaseUrl = process.env.DATABASE_URL || 'sqlite:database.sqlite';

const isSqlite = databaseUrl.startsWith('sqlite:');
const isPostgres = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');

const sequelizeOptions = {
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  retry: {
    max: 3
  }
};

if (isSqlite) {
  sequelizeOptions.dialect = 'sqlite';
  // Remove 'sqlite:' prefix to get the actual file path
  sequelizeOptions.storage = databaseUrl.replace('sqlite:', '');
} else if (isPostgres) {
  sequelizeOptions.dialect = 'postgres';
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  };
  sequelizeOptions.pool = {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  };
} else {
  // If it's not sqlite and not a URL, it might just be a filename (Beginner mistake)
  // Let's force it to be SQLite if it looks like a file path
  sequelizeOptions.dialect = 'sqlite';
  sequelizeOptions.storage = databaseUrl;
}

const sequelize = new Sequelize(databaseUrl, sequelizeOptions);

module.exports = sequelize;
