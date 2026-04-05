const { Sequelize } = require('sequelize');
const path = require('path');

// --- Teacher's Note: Smart Database Detection ---
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV === 'production') {
  console.error('[CRITICAL] DATABASE_URL is missing in production environment! Check your environment variables.');
  process.exit(1);
}

const finalDatabaseUrl = databaseUrl || 'sqlite:database.sqlite';

const isSqlite = finalDatabaseUrl.startsWith('sqlite:');
const isPostgres = finalDatabaseUrl.startsWith('postgres://') || finalDatabaseUrl.startsWith('postgresql://');

const sequelizeOptions = {
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  retry: {
    max: 3
  }
};

let sequelize;

if (isPostgres) {
  // Use professional PostgreSQL settings for Render/Neon
  sequelize = new Sequelize(finalDatabaseUrl, {
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
  const storagePath = finalDatabaseUrl.replace('sqlite:', '');
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
    storage: finalDatabaseUrl
  });
}

module.exports = sequelize;
