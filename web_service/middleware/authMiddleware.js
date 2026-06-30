const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, data: null, error: 'Not authorized, no token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found.' });
        }

        if (user.blockedSessionIds && user.blockedSessionIds.includes(decoded.sessionId)) {
            return res.status(401).json({ success: false, error: 'Session expired or invalidated. Please log in again.' });
        }

        req.user = user;
        req.sessionId = decoded.sessionId;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, data: null, error: 'Not authorized, token is invalid.' });
    }
};

module.exports = { protect };