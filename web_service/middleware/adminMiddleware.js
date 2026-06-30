const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

const isAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, data: null, error: 'Authentication required.' });
        }

        const user = await User.findById(req.user.id);

        if (!user || !user.isAdmin) {
            return res.status(403).json({ success: false, data: null, error: 'Access denied: Admin privileges are required.' });
        }

        next();
    } catch (error) {
        console.error("Admin verification middleware error:", error);
        return res.status(500).json({ success: false, data: null, error: 'Server error during admin verification.' });
    }
};

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    standardHeaders: true, 
    legacyHeaders: false, 
    message: { 
        success: false, 
        data: null, 
        error: 'Too many requests from this IP to admin routes, please try again after 15 minutes.' 
    }
});

module.exports = { isAdmin, adminLimiter };