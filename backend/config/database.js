const { Sequelize } = require('sequelize');
const path = require('path');

// --- Teacher's Note: Smart Database Detection ---
const databaseUrl = process.env.DATABASE_URL;

// On Render, we should never fall back to SQLite
const isRender = process.env.RENDER === 'true';

if (isRender && !databaseUrl) {
  console.error('[CRITICAL] On Render, you MUST provide DATABASE_URL (check for typos like DATABSE_URL).');
  process.exit(1);
}

if (!databaseUrl && process.env.NODE_ENV === 'production') {
  console.error('[CRITICAL] DATABASE_URL is missing in production environment! Check your environment variables.');
  process.exit(1);
}

const finalDatabaseUrl = databaseUrl || 'sqlite:database.sqlite';

const isPostgres = finalDatabaseUrl.startsWith('postgres://') || finalDatabaseUrl.startsWith('postgresql://');
const isSqlite = finalDatabaseUrl.startsWith('sqlite:');

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
} else if (isSqlite && !isRender) {
  // Use local SQLite for development, but NOT on Render
  const storagePath = finalDatabaseUrl.replace('sqlite:', '');
  sequelize = new Sequelize({
    ...sequelizeOptions,
    dialect: 'sqlite',
    storage: storagePath
  });
} else if (isRender) {
  // Catch-all for Render to prevent loading sqlite3
  console.error('[CRITICAL] On Render, your DATABASE_URL did not match PostgreSQL pattern. Please check the URL.');
  process.exit(1);
} else {
  // Fallback for local development
  sequelize = new Sequelize({
    ...sequelizeOptions,
    dialect: 'sqlite',
    storage: finalDatabaseUrl
  });
}

module.exports = sequelize;
