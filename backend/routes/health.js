const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const mlService = require('../services/mlService');

/**
 * @route   GET /api/v1/health
 * @desc    Check system health (Database & ML Service)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // 1. Check Database connection
    let dbStatus = 'disconnected';
    try {
      await sequelize.authenticate();
      dbStatus = 'connected';
    } catch (err) {
      console.error(`[Health Check] Database connection failed: ${err.message}`);
      // If database is down, return 503 as per requirements
      return res.status(503).json({
        success: false,
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        mlService: 'unknown',
        error: 'Database service unavailable'
      });
    }

    // 2. Check ML Service status
    const mlStatus = await mlService.checkHealth();

    // 3. Return combined health report (200 if database is connected)
    return res.status(200).json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      mlService: mlStatus.available ? 'available' : 'unavailable',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error(`[Health Check] Unexpected error: ${error.message}`);
    return res.status(500).json({
      success: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
