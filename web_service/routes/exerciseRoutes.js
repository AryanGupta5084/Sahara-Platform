const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getExercises, startOrContinueExercise } = require('../controllers/exerciseController');

router.use(protect);
router.get('/', getExercises);
router.post('/start', startOrContinueExercise);

module.exports = router;