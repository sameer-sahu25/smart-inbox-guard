require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

const mlService = require('./services/mlService');

async function startServer() {
  try {
    // Check critical env variables
    const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
    const missing = requiredEnv.filter(k => !process.env[k]);
    if (missing.length > 0) {
      console.error(`[CRITICAL] Missing environment variables: ${missing.join(', ')}`);
      process.exit(1);
    }

    // Verify JWT_EXPIRES_IN is a valid timespan string or number
    const jwt = require('jsonwebtoken');
    try {
      jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    } catch (e) {
      console.error(`[CRITICAL] JWT_EXPIRES_IN is invalid: ${process.env.JWT_EXPIRES_IN}`);
      console.error(`Please set it to a valid value like "1825d" or "7d".`);
      process.exit(1);
    }

    await sequelize.authenticate();
    console.log('Database connection established successfully');
    await sequelize.sync({ alter: false });
    console.log('Database models synchronized');
    
    // ML Handshake on Startup
    const mlStatus = await mlService.checkHealth();
    if (mlStatus.available) {
      console.log(`[ML Handshake] SUCCESS: Neural Engine is ${mlStatus.status.toUpperCase()}`);
    } else {
      console.warn(`[ML Handshake] WARNING: Neural Engine is OFFLINE. System running in limited mode.`);
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer(); // triggered restart at 18:13
