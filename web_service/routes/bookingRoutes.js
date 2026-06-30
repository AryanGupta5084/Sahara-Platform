const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    getPublicCounselors, 
    getAvailableSlots, 
    bookAppointment, 
    getMyAppointments, 
    cancelAppointment 
} = require('../controllers/bookingController');

router.get('/counselors', getPublicCounselors);
router.get('/slots/:counselorId', getAvailableSlots);

router.get('/my-appointments', protect, getMyAppointments);
router.post('/appointments', protect, bookAppointment);
router.put('/appointments/:id/cancel', protect, cancelAppointment);

module.exports = router;