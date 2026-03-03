const express = require('express');
const { query: validate, validationResult } = require('express-validator');
const { cache } = require('../config/redis');
const { getVideos, getVideoById } = require('../services/video.service');

const router = express.Router();

// GET /videos
router.get('/',
    [
        validate('genre').optional().isString().trim(),
        validate('page').optional().isInt({ min: 1 }).toInt(),
        validate('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        validate('search').optional().isString().trim().escape(),
        validate('live').optional().isBoolean().toBoolean(),
    ],
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        try {
            const { genre, page = 1, limit = 24, search, live } = req.query;
            const cacheKey = `videos:${genre || 'all'}:${page}:${limit}:${search || ''}:${live || ''}`;

            const data = await cache(cacheKey, 60, () =>
                getVideos({ genre, page: Number(page), limit: Number(limit), search, liveOnly: live === 'true' })
            );

            res.json({ success: true, ...data });
        } catch (err) {
            next(err);
        }
    }
);

// GET /videos/:videoId
router.get('/:videoId', async (req, res, next) => {
    try {
        const { videoId } = req.params;
        const cacheKey = `video:${videoId}`;
        const video = await cache(cacheKey, 300, () => getVideoById(videoId));
        if (!video) return res.status(404).json({ success: false, error: 'Video not found' });
        res.json({ success: true, video });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
