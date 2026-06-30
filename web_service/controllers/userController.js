const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const generateToken = (id, sessionId, isGuest = false) => {
    return jwt.sign(
        { id, sessionId, isGuest },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );
};

exports.registerUser = async (req, res) => {
    try {
        const { username, email, password, hasAgreed } = req.body;
        
        if (!username || !email || !password || !hasAgreed) {
            return res.status(400).json({ success: false, data: null, error: "Please provide all required fields." });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, data: null, error: "User already exists with this email." });
        }

        const user = await User.create({
            username,
            email,
            password,
            termsAgreed: new Date()
        });

        const sessionId = uuidv4();
        const token = generateToken(user._id, sessionId, false);

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                token
            },
            error: null
        });
    } catch (err) {
        res.status(500).json({ success: false, data: null, error: "Registration failed due to a server error." });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, data: null, error: "Please provide both email and password." });
        }

        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, data: null, error: "Invalid credentials." });
        }

        const sessionId = uuidv4();
        const token = generateToken(user._id, sessionId, false);

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                token
            },
            error: null
        });
    } catch (err) {
        res.status(500).json({ success: false, data: null, error: "Login failed due to a server error." });
    }
};

exports.logout = async (req, res) => {
    try {
        if (!req.user || !req.sessionId) {
            return res.status(401).json({ success: false, error: 'User not authenticated.' });
        }

        req.user.blockedSessionIds.push(req.sessionId);
        await req.user.save();

        res.status(200).json({ success: true, data: { message: "Logged out successfully." } });
    } catch(err) {
        res.status(500).json({ success: false, error: "Server error during logout." });
    }
};

exports.guestLogout = async (req, res) => {
    try {
        if (!req.user.isGuest) {
            return res.status(400).json({ success: false, error: 'This route is only for guest users.' });
        }

        req.user.blockedSessionIds.push(req.sessionId);
        await req.user.save();

        res.status(200).json({ success: true, data: { message: "Guest session invalidated. Data will be purged per retention policy." } });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error during guest logout." });
    }
};

exports.getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: "Not authorized" });
        }
        res.status(200).json({ success: true, data: req.user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};