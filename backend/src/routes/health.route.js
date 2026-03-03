const express = require('express');
const { pool } = require('../config/db');
const { redis } = require('../config/redis');

const router = express.Router();

router.get('/', async (req, res) => {
    const checks = { status: 'ok', timestamp: new Date().toISOString(), services: {} };

    // DB check
    try {
        await pool.query('SELECT 1');
        checks.services.postgres = 'healthy';
    } catch {
        checks.services.postgres = 'unhealthy';
        checks.status = 'degraded';
    }

    // Redis check
    try {
        await redis.ping();
        checks.services.redis = 'healthy';
    } catch {
        checks.services.redis = 'unhealthy';
        checks.status = 'degraded';
    }

    const statusCode = checks.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(checks);
});

module.exports = router;
