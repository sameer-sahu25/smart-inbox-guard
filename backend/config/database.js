const { Sequelize } = require('sequelize');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const isSqlite = process.env.DATABASE_URL.startsWith('sqlite:');

const sequelizeOptions = {
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  retry: {
    max: 3
  }
};

if (isSqlite) {
  sequelizeOptions.dialect = 'sqlite';
  sequelizeOptions.storage = process.env.DATABASE_URL.replace('sqlite:', '');
} else {
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
}

const sequelize = new Sequelize(process.env.DATABASE_URL, sequelizeOptions);

module.exports = sequelize;
