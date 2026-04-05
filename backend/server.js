require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

const mlService = require('./services/mlService');

async function startServer() {
  try {
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
