const { Sequelize } = require('sequelize');
const path = require('path');

// --- Teacher's Note: Smart Database Detection ---
const databaseUrl = process.env.DATABASE_URL || 'sqlite:database.sqlite';

const isSqlite = databaseUrl.startsWith('sqlite:');
const isPostgres = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');

const sequelizeOptions = {
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  retry: {
    max: 3
  }
};

let sequelize;

if (isPostgres) {
  // Use professional PostgreSQL settings for Render/Neon
  sequelize = new Sequelize(databaseUrl, {
    ...sequelizeOptions,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  });
} else if (isSqlite) {
  // Use local SQLite for development
  const storagePath = databaseUrl.replace('sqlite:', '');
  sequelize = new Sequelize({
    ...sequelizeOptions,
    dialect: 'sqlite',
    storage: storagePath
  });
} else {
  // Fallback for simple filenames
  sequelize = new Sequelize({
    ...sequelizeOptions,
    dialect: 'sqlite',
    storage: databaseUrl
  });
}

module.exports = sequelize;
