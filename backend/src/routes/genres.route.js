const express = require('express');
const { cache } = require('../config/redis');
const { getGenreStats } = require('../services/video.service');

const router = express.Router();

// GET /genres
router.get('/', async (req, res, next) => {
    try {
        const stats = await cache('genres:stats', 120, getGenreStats);

        // Total count for "All"
        const totalCount = stats.reduce((sum, s) => sum + parseInt(s.count, 10), 0);
        const totalLive = stats.reduce((sum, s) => sum + parseInt(s.live_count, 10), 0);

        const genres = [
            {
                name: 'All',
                slug: 'all',
                count: totalCount,
                live_count: totalLive,
            },
            ...stats.map(s => ({
                name: s.genre,
                slug: s.genre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                count: parseInt(s.count, 10),
                live_count: parseInt(s.live_count, 10),
            }))
        ];

        res.json({ success: true, genres });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
