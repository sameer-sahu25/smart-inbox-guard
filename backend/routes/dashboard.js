const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/summary', dashboardController.getSummary);
router.get('/stats', dashboardController.getStats);
router.get('/trend', dashboardController.getTrend);

module.exports = router;
