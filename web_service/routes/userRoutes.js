const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, logout, guestLogout, getMe } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        success: false, 
        data: null, 
        error: 'Too many authentication attempts from this IP, please try again after 15 minutes.' 
    },
    skipSuccessfulRequests: false
});

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

router.post('/guest', authLimiter, async (req, res) => {
    try {
        const guestId = `guest_${uuidv4()}`;
        const expireAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const guestUser = await User.create({
            username: guestId,
            isGuest: true,
            expireAt: expireAt
        });

        const sessionId = uuidv4();
        const token = jwt.sign(
            { id: guestUser._id, sessionId, isGuest: true },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        res.status(201).json({
            success: true,
            data: {
                _id: guestUser._id,
                username: guestUser.username,
                isGuest: true,
                token
            },
            error: null
        });
    } catch (err) {
        res.status(500).json({ success: false, data: null, error: "Guest login failed due to a server error." });
    }
});

router.post('/guest-logout', protect, guestLogout);

router.get('/server-date', (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    res.status(200).json({ success: true, data: { today: today.toISOString() } });
});

module.exports = router;