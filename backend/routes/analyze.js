const express = require('express');
const router = express.Router();
const analyzeController = require('../controllers/analyzeController');
const { validateAnalyze } = require('../middleware/validate');
const { analyzeLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

router.use(analyzeLimiter);

router.post('/classify', optionalAuth, validateAnalyze, analyzeController.analyze);
router.post('/bspam', auth, analyzeController.batchAnalyze);

module.exports = router;
