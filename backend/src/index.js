require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const logger = require('./config/logger');
const { rateLimiter } = require('./middleware/rateLimit.middleware');
const videosRoute = require('./routes/videos.route');
const genresRoute = require('./routes/genres.route');
const liveRoute = require('./routes/live.route');
const searchRoute = require('./routes/search.route');
const healthRoute = require('./routes/health.route');

// ── Start automation worker via cron ─────────────
require('./workers/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security Middleware ───────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Performance Middleware ─────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.http(msg.trim()) } }));

// ── Rate Limiting ─────────────────────────────────
app.use('/api', rateLimiter);

// ── Routes ────────────────────────────────────────
app.use('/health', healthRoute);
app.use('/api/health', healthRoute);
app.use('/videos', videosRoute);
app.use('/api/videos', videosRoute);
app.use('/genres', genresRoute);
app.use('/api/genres', genresRoute);
app.use('/live', liveRoute);
app.use('/api/live', liveRoute);
app.use('/search', searchRoute);
app.use('/api/search', searchRoute);

// ── 404 Handler ───────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────
app.use((err, req, res, _next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Backend API Gateway running on port ${PORT}`);
});

module.exports = app;
