const axios = require('axios');
const logger = require('../config/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Classify a video using the FastAPI CLIP microservice
 * @param {Object} video - Video record with thumbnail_url, title, description
 * @returns {{ genre: string, score: number, all_scores: object }}
 */
const classifyVideo = async ({ thumbnail_url, title, description }) => {
    try {
        const resp = await axios.post(
            `${AI_SERVICE_URL}/classify`,
            { thumbnail_url, title, description },
            { timeout: 30000 }
        );
        return resp.data;
    } catch (err) {
        if (err.response) {
            logger.warn(`Classifier returned ${err.response.status}: ${JSON.stringify(err.response.data)}`);
        } else {
            logger.warn(`Classifier unavailable: ${err.message}`);
        }
        // Fallback: return Others with 0 confidence
        return { genre: 'Others', score: 0.0, all_scores: {} };
    }
};

/**
 * Check if AI service is healthy
 */
const isHealthy = async () => {
    try {
        const resp = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
        return resp.status === 200;
    } catch {
        return false;
    }
};

/**
 * Sync all active genres from DB to the AI classifier
 */
const syncGenresToAI = async () => {
    try {
        const { loadGenrePrompts } = require('./genreDiscovery.service');
        const genres = await loadGenrePrompts();

        await axios.post(`${AI_SERVICE_URL}/genres/sync`, {
            genres: genres.map(g => ({
                genre: g.genre,
                prompts: g.prompts || []
            }))
        });
        logger.info(`[Classifier] Synchronized ${genres.length} genres to AI service`);
        return true;
    } catch (err) {
        logger.warn(`[Classifier] Sync failed: ${err.message}`);
        return false;
    }
};

module.exports = { classifyVideo, isHealthy, syncGenresToAI };
