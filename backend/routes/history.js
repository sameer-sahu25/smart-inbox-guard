const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', historyController.getHistory);
router.get('/:id', historyController.getIncident);
router.delete('/:id', historyController.deleteIncident);

module.exports = router;
