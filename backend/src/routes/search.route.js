const express = require('express');
const { query: validate, validationResult } = require('express-validator');
const { cache } = require('../config/redis');
const { getVideos } = require('../services/video.service');

const router = express.Router();

// GET /search?q=bgmi&page=1&limit=24
router.get('/',
    [
        validate('q').notEmpty().withMessage('Search query is required').isString().trim().escape(),
        validate('page').optional().isInt({ min: 1 }).toInt(),
        validate('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        try {
            const { q, page = 1, limit = 24 } = req.query;
            const cacheKey = `search:${encodeURIComponent(q)}:${page}:${limit}`;
            const data = await cache(cacheKey, 120, () =>
                getVideos({ search: q, page: Number(page), limit: Number(limit) })
            );
            res.json({ success: true, query: q, ...data });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
