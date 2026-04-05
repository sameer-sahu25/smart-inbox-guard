const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { validateFeedback } = require('../middleware/validate');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/', validateFeedback, feedbackController.submitFeedback);
router.get('/stats', feedbackController.getFeedbackStats);

module.exports = router;
