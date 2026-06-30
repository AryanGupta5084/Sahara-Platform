const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAvailableTests, getTestByKey, submitTest } = require('../controllers/screeningController');

router.use(protect);

router.get('/', getAvailableTests);
router.get('/:testKey', getTestByKey);
router.post('/:testKey', submitTest);

module.exports = router;