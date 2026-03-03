const cron = require('node-cron');
const logger = require('../config/logger');
const { runDiscoveryPipeline, refreshLiveStreams } = require('./videoProcessor.worker');

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS, 10) || 900000; // 15 min

// Convert ms to cron-compatible minutes (min 1, max 59)
const pollMinutes = Math.max(1, Math.min(59, Math.floor(POLL_INTERVAL_MS / 60000)));

logger.info(`[Scheduler] Full discovery every ${pollMinutes} minute(s)`);
logger.info(`[Scheduler] Live stream refresh every 2 minutes`);

// ── Full discovery pipeline (default: every 15 minutes) ──
cron.schedule(`*/${pollMinutes} * * * *`, async () => {
    try {
        await runDiscoveryPipeline();
    } catch (err) {
        logger.error(`[Scheduler] Discovery error: ${err.message}`);
    }
});

// ── Live stream refresh (every 2 minutes for near-realtime) ──
cron.schedule('*/2 * * * *', async () => {
    try {
        await refreshLiveStreams();
    } catch (err) {
        logger.error(`[Scheduler] Live refresh error: ${err.message}`);
    }
});

// ── Initial run on startup (delayed 10s to let DB connect) ──
setTimeout(async () => {
    logger.info('[Scheduler] ⏱ Running initial discovery on startup...');
    try {
        await runDiscoveryPipeline();
    } catch (err) {
        logger.error(`[Scheduler] Initial run error: ${err.message}`);
    }
}, 10000);

logger.info('[Scheduler] ✅ Cron jobs scheduled');
