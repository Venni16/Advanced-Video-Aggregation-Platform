const Redis = require('ioredis');
const logger = require('./logger');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: false,
    enableReadyCheck: true,
});

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.warn(`Redis error: ${err.message}`));
redis.on('reconnecting', () => logger.info('Redis reconnecting...'));

/**
 * Get cached value or compute and cache it
 * @param {string} key - Cache key
 * @param {number} ttlSeconds - Time-to-live in seconds
 * @param {Function} fetchFn - Async function to compute value on cache miss
 */
const cache = async (key, ttlSeconds, fetchFn) => {
    try {
        const cached = await redis.get(key);
        if (cached) return JSON.parse(cached);
        const value = await fetchFn();
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
        return value;
    } catch (err) {
        logger.warn(`Cache error for key "${key}": ${err.message} — falling back to DB`);
        return fetchFn();
    }
};

/**
 * Invalidate cache keys matching a pattern
 */
const invalidate = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) await redis.del(...keys);
        logger.debug(`Invalidated ${keys.length} cache keys: ${pattern}`);
    } catch (err) {
        logger.warn(`Cache invalidation error: ${err.message}`);
    }
};

module.exports = { redis, cache, invalidate };
