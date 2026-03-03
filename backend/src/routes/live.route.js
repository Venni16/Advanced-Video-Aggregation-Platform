const express = require('express');
const { cache } = require('../config/redis');
const { getLiveStreams } = require('../services/video.service');

const router = express.Router();

// SSE clients store
const clients = new Set();

// GET /live — returns live streams JSON
router.get('/', async (req, res, next) => {
    try {
        const streams = await cache('live:streams', 30, getLiveStreams);
        res.json({ success: true, streams, count: streams.length });
    } catch (err) {
        next(err);
    }
});

// GET /live/stream — Server-Sent Events for real-time live updates
router.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const client = { id: Date.now(), res };
    clients.add(client);

    // Send initial ping
    res.write(`event: ping\ndata: connected\n\n`);

    req.on('close', () => {
        clients.delete(client);
    });
});

/**
 * Broadcast a live status update to all SSE clients
 * Called by the automation worker when live status changes
 */
const broadcastLiveUpdate = (data) => {
    const payload = JSON.stringify(data);
    for (const client of clients) {
        try {
            client.res.write(`event: live-update\ndata: ${payload}\n\n`);
        } catch {
            clients.delete(client);
        }
    }
};

module.exports = router;
module.exports.broadcastLiveUpdate = broadcastLiveUpdate;
