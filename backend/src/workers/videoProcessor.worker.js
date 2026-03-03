const { Queue, Worker } = require('bullmq');
const logger = require('../config/logger');
const { redis } = require('../config/redis');
const { discoverAllVideos, fetchLiveStreams, formatVideoRecord } = require('../services/youtube.service');
const { classifyVideo } = require('../services/classifier.service');
const { upsertVideo, videoExists } = require('../services/video.service');
const { processVideoForGenreDiscovery } = require('../services/genreDiscovery.service');
const { invalidate } = require('../config/redis');
const { broadcastLiveUpdate } = require('../routes/live.route');
const { query } = require('../config/db');

// ── Queue & Worker Setup ──────────────────────────
const connection = redis;

const videoQueue = new Queue('video-processing', { connection });

// ──────────────────────────────────────────────────
//  MAIN PIPELINE FUNCTION
//  Called by scheduler, processes a batch of videos
// ──────────────────────────────────────────────────
const runDiscoveryPipeline = async () => {
    logger.info('[Worker] 🚀 Starting video discovery pipeline...');

    let rawVideos;
    try {
        rawVideos = await discoverAllVideos();
        logger.info(`[Worker] Discovered ${rawVideos.length} videos from YouTube`);
    } catch (err) {
        logger.error(`[Worker] Discovery failed: ${err.message}`);
        return;
    }

    let newCount = 0, updatedCount = 0, skippedCount = 0;

    for (const item of rawVideos) {
        try {
            const formatted = formatVideoRecord(item);
            if (!formatted.video_id) continue;

            const exists = await videoExists(formatted.video_id);

            // ── Step 1: Genre Auto-Discovery from Tags ────
            const tagGenre = await processVideoForGenreDiscovery(
                formatted.title,
                formatted.tags || []
            );

            // ── Step 2: CLIP Classification ───────────────
            let genre = 'Others';
            let classificationScore = 0;
            let classificationResult = null;

            if (formatted.thumbnail_url) {
                classificationResult = await classifyVideo({
                    thumbnail_url: formatted.thumbnail_url,
                    title: formatted.title,
                    description: formatted.description,
                });
                genre = classificationResult.genre;
                classificationScore = classificationResult.score;

                // ── Trust Tags more than mediocre AI ──────────────────────
                // If we found a specific tag/title match, and AI isn't 
                // EXTREMELY sure (>0.8), trust the tag/title ground truth.
                if (tagGenre && (classificationScore < 0.8 || genre === 'Others')) {
                    genre = tagGenre;
                    logger.debug(`[Worker] Using tag/title hint for "${formatted.video_id}": ${tagGenre}`);
                }
            } else if (tagGenre) {
                genre = tagGenre;
            }

            // ── Step 3: Upsert Video ──────────────────────
            const prev = exists
                ? await query(`SELECT live_status FROM videos WHERE video_id = $1`, [formatted.video_id])
                : null;

            const upsertResult = await upsertVideo({ ...formatted, genre, classification_score: classificationScore });

            // ── Step 4: Log classification (after video exists) ────
            if (formatted.thumbnail_url && classificationResult) {
                await query(
                    `INSERT INTO classification_logs (video_id, genre, score, all_scores)
                     VALUES ($1, $2, $3, $4)`,
                    [
                        formatted.video_id,
                        genre,
                        classificationScore,
                        JSON.stringify(classificationResult.all_scores || {})
                    ]
                );
            }

            // ── Step 5: Broadcast Live Changes ───────────
            if (prev && prev.rows[0]) {
                const prevStatus = prev.rows[0].live_status;
                if (prevStatus !== upsertResult.live_status) {
                    broadcastLiveUpdate({
                        video_id: upsertResult.video_id,
                        live_status: upsertResult.live_status,
                        title: formatted.title,
                        thumbnail_url: formatted.thumbnail_url,
                    });
                    logger.info(`[Worker] Live status changed: ${upsertResult.video_id} → ${upsertResult.live_status}`);
                }
            }

            exists ? updatedCount++ : newCount++;
        } catch (err) {
            logger.warn(`[Worker] Failed to process video: ${err.message}`);
            skippedCount++;
        }
    }

    // ── Invalidate caches ────────────────────────────
    await invalidate('videos:*');
    await invalidate('genres:*');
    await invalidate('live:*');
    await invalidate('search:*');

    logger.info(`[Worker] ✅ Pipeline complete — New: ${newCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);
};

// ── Live Stream Refresh (lightweight, runs more often) ──
const refreshLiveStreams = async () => {
    logger.info('[Worker] 📡 Checking live streams...');
    try {
        const liveItems = await fetchLiveStreams();
        for (const item of liveItems) {
            const formatted = formatVideoRecord(item);
            if (!formatted.video_id) continue;
            // Quick upsert without full classification for live streams
            await upsertVideo({ ...formatted, genre: 'Others', classification_score: 0 });
        }
        await invalidate('live:*');
        logger.info(`[Worker] ✅ Live refresh done — ${liveItems.length} live streams`);
    } catch (err) {
        logger.error(`[Worker] Live refresh failed: ${err.message}`);
    }
};

module.exports = { videoQueue, runDiscoveryPipeline, refreshLiveStreams };
