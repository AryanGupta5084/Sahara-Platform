require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.error('❌ FATAL ERROR: JWT_SECRET is missing or too short. Please set a strong secret in your .env file.');
    process.exit(1); 
}

const express = require('express');
const http = require('http'); 
const { Server } = require("socket.io");
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const seedScreeningTests = require('./utils/seedScreeningTests'); 

const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const forumRoutes = require('./routes/forumRoutes');
const journalRoutes = require('./routes/journalRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const counselorRoutes = require('./routes/counselorRoutes');
const screeningRoutes = require('./routes/screeningRoutes');

const app = express();
const server = http.createServer(app); 
const io = new Server(server, {        
    cors: {
        origin: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
        methods: ["GET", "POST"]
    }
});

(async () => {
    try {
        await connectDB();
        console.log('✅ MongoDB connected successfully.');
        
        await seedScreeningTests();
    } catch (err) {
        console.error('❌ CRITICAL: MongoDB connection failed. The application cannot start.', err?.message || err);
        process.exit(1); 
    }
})();

require('./socket/socketHandler')(io);

app.set('trust proxy', 1);

app.use(
    helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
            directives: {
                "default-src": ["'self'"],
                "script-src": [
                    "'self'",
                    "https://cdn.jsdelivr.net/npm/chart.js" 
                ],
                "style-src": [
                    "'self'",
                    "https://cdnjs.cloudflare.com" 
                ],
                "connect-src": [
                    "'self'", 
                    "ws:",  
                    "wss:"  
                ],
                "img-src": ["'self'", "data:", "blob:"],
                "font-src": ["'self'", "https://cdnjs.cloudflare.com"], 
                "object-src": ["'none'"], 
                "upgrade-insecure-requests": [], 
            },
        },
    })
);

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('This origin is not allowed by CORS'));
            }
        },
        credentials: false, 
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

if (process.env.NODE_ENV !== 'production') {
    app.use(require('morgan')('dev'));
}

app.use(compression()); 
app.use(express.json({ limit: '100kb' })); 
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 600, 
    standardHeaders: true, 
    legacyHeaders: false, 
});
app.use('/api', apiLimiter);

app.get('/healthz', (req, res) => {
    res.status(200).json({ ok: true, uptime: process.uptime() });
});

app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/counselors', counselorRoutes);
app.use('/api/screening', screeningRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.all(/^\/api\/.*/, (req, res) => {
    res.status(404).json({ success: false, data: null, error: 'API route not found' });
});

app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err?.stack || err);
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        data: null,
        error: status === 500 ? 'Internal server error' : err.message,
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`\n✅ Server running and listening on: http://localhost:${PORT}\n`);
});