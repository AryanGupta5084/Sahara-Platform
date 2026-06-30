const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { 
    getCounselorAppointments, 
    getMyCounselorProfile, 
    updateAvailability 
} = require('../controllers/counselorController');

router.use(protect);

router.get('/my-appointments', getCounselorAppointments);
router.get('/profile', getMyCounselorProfile);
router.put('/availability', updateAvailability);

module.exports = router;