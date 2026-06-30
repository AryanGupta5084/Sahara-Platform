const Counselor = require('../models/Counselor');
const Appointment = require('../models/Appointment');

exports.getCounselorAppointments = async (req, res) => {
    try {
        const counselor = await Counselor.findOne({ user: req.user.id });
        if (!counselor) {
            return res.status(403).json({ success: false, data: null, error: 'Access denied. Not a counselor.' });
        }
        
        const appointments = await Appointment.find({ counselor: counselor._id })
            .populate('user', 'username email')
            .sort({ startTime: 1 });
            
        res.status(200).json({ success: true, data: appointments, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: 'Server error fetching counselor appointments.' });
    }
};

exports.getMyCounselorProfile = async (req, res) => {
    try {
        const counselor = await Counselor.findOne({ user: req.user.id })
            .populate('user', 'username email');
            
        if (!counselor) {
            return res.status(404).json({ success: false, data: null, error: 'Profile not found.' });
        }
        
        res.status(200).json({ success: true, data: counselor, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: 'Server error fetching profile.' });
    }
};

exports.updateAvailability = async (req, res) => {
    try {
        const { availability } = req.body;
        
        const counselor = await Counselor.findOneAndUpdate(
            { user: req.user.id },
            { availability },
            { new: true, runValidators: true }
        );
        
        if (!counselor) {
            return res.status(404).json({ success: false, data: null, error: 'Profile not found.' });
        }
        
        res.status(200).json({ success: true, data: counselor, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: 'Server error updating availability.' });
    }
};