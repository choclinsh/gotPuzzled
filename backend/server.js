/**
 * server.js — application entry point.
 *
 * Bootstraps Express, attaches middleware (CORS, JSON parsing, logger),
 * mounts all API route groups, registers the Socket.IO co-op and racing
 * handlers, connects to MySQL via Sequelize, and starts the HTTP server.
 *
 * Start command: node server.js (or npm start from the backend/ directory).
 * Default port:  3000  (override with the PORT env variable).
 */
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const logger = require('./src/middleware/logger');
const userRoutes = require('./src/routes/users');
const scoresRoutes = require('./src/routes/scores');
const authRoutes = require('./src/routes/auth');
const settingsRoutes = require('./src/routes/settings');
const imagesRoutes = require('./src/routes/images');
const aiRoutes     = require('./src/routes/ai');
const { sequelize } = require('./src/models/index');
const setupCoopSocket   = require('./src/socket/coopHandler');
const setupRacingSocket = require('./src/socket/racingHandler');
const path = require('path');

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [];

function isOriginAllowed(origin) {
    if (!origin) return true;
    if (origin.startsWith('http://localhost') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) return true;
    return ALLOWED_ORIGINS.some(o => origin === o.trim());
}

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (isOriginAllowed(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'), false);
        },
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(express.json());
app.use(logger);

app.use('/api/users', userRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/ai',     aiRoutes);
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        data: null,
        error: {
            code: 'ENDPOINT_NOT_FOUND',
            message: `The requested URL '${req.originalUrl}' does not exist on this server.`,
            details: {}
        }
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred on the server.', details: {} }
    });
});

setupCoopSocket(io);
setupRacingSocket(io);

sequelize.authenticate()
    .then(() => {
        console.log('Connected to MySQL database.');
        server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    })
    .catch(err => {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    });
