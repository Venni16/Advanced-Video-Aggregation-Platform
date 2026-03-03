/**
 * Genre Auto-Discovery Service
 * 
 * Detects new genres from YouTube video data (tags, titles, category IDs)
 * and auto-creates genre_prompts entries so CLIP can classify them.
 * 
 * YouTube Gaming Category IDs:
 * 20 = Gaming
 * All subcategory detection is done via tag analysis.
 */

const { query } = require('../config/db');
const logger = require('../config/logger');

const YT_CATEGORY_MAP = {
    20: 'Others', // Generic Gaming
};

/**
 * Stop words to ignore when discovering new genres from tags
 */
const TAG_STOP_WORDS = new Set([
    'tamil', 'gaming', 'gamer', 'live', 'stream', 'gameplay', 'walkthrough',
    'funny', 'video', 'shorts', 'new', 'trending', 'viral', 'entertainment',
    'pro', 'noob', 'tips', 'tricks', 'tamil gaming', 'tamilgamer', 'play'
]);

/**
 * Simple in-memory counter for tag frequency discovery
 */
const tagCounts = new Map();
const DISCOVERY_THRESHOLD = 3;

/**
 * Common tag patterns → genre mapping
 * Used to auto-detect genre from video tags/title
 */
const TAG_GENRE_PATTERNS = [
    { pattern: /\bBGMI\b/i, genre: 'BGMI' },
    { pattern: /\bBattlegrounds Mobile\b/i, genre: 'BGMI' },
    { pattern: /\bfree\s*fire\b/i, genre: 'Free Fire' },
    { pattern: /\bGTA\s*[V5]\b/i, genre: 'GTA V' },
    { pattern: /\bGrand Theft Auto\b/i, genre: 'GTA V' },
    { pattern: /\bminecraft\b/i, genre: 'Minecraft' },
    { pattern: /\bvalorant\b/i, genre: 'Valorant' },
    { pattern: /\bcall\s*of\s*duty\b/i, genre: 'Call of Duty' },
    { pattern: /\bCOD\b/, genre: 'Call of Duty' },
    { pattern: /\besport/i, genre: 'eSports' },
    { pattern: /\btournament\b/i, genre: 'eSports' },
    { pattern: /\bcommentary\b/i, genre: 'Streaming Commentary' },
    { pattern: /\breaction\b/i, genre: 'Reaction' },
    { pattern: /\banime\b/i, genre: 'Anime' },
    { pattern: /\bmanga\b/i, genre: 'Anime' },
    { pattern: /\bvlog\b/i, genre: 'Vlog' },
    { pattern: /\bhorror\b/i, genre: 'Horror' },
    { pattern: /\bresident\s*evil\b/i, genre: 'Horror' },
    { pattern: /\bsimulator\b/i, genre: 'Simulator' },
    // Emerging games — auto-detected
    { pattern: /\bApex\s*Legends\b/i, genre: 'Apex Legends' },
    { pattern: /\bFortnite\b/i, genre: 'Fortnite' },
    { pattern: /\bAmong\s*Us\b/i, genre: 'Among Us' },
    { pattern: /\bPokemon\b/i, genre: 'Pokemon' },
    { pattern: /\bFIFA\b/i, genre: 'FIFA' },
    { pattern: /\bRoblox\b/i, genre: 'Roblox' },
    { pattern: /\bPubg\b/i, genre: 'PUBG' },
    { pattern: /\bRocket\s*League\b/i, genre: 'Rocket League' },
    { pattern: /\bOverwatch\b/i, genre: 'Overwatch' },
];

/**
 * Load all active genre prompts from DB
 * Called by classifier on startup and periodically refreshed
 */
const loadGenrePrompts = async () => {
    const res = await query(
        `SELECT genre, slug, prompts FROM genre_prompts WHERE is_active = TRUE ORDER BY auto_detected ASC, id ASC`
    );
    return res.rows;
};

/**
 * Detect genre hint from video tags and title (fast pre-filter, no CLIP)
 * Returns genre name or null
 */
const detectGenreFromTags = (title = '', tags = []) => {
    const haystack = [title, ...tags].join(' ');
    for (const { pattern, genre } of TAG_GENRE_PATTERNS) {
        if (pattern.test(haystack)) return genre;
    }
    return null;
};

/**
 * Auto-create a new genre_prompt row if a new game name is detected
 * from YouTube tags and doesn't yet exist in DB.
 * 
 * @param {string} genre - Genre name to auto-create
 */
const autoCreateGenre = async (genre) => {
    const slug = genre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const prompts = [
        `${genre} Tamil gaming gameplay`,
        `${genre} Tamil YouTube video`,
        `Tamil gamer playing ${genre}`,
    ];

    try {
        await query(
            `INSERT INTO genre_prompts (genre, slug, prompts, auto_detected)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (slug) DO NOTHING`,
            [genre, slug, prompts]
        );
        logger.info(`[GenreDiscovery] Auto-created genre: "${genre}"`);

        // Push to AI microservice
        const { syncGenresToAI } = require('./classifier.service');
        await syncGenresToAI();
    } catch (err) {
        logger.warn(`[GenreDiscovery] Failed to auto-create "${genre}": ${err.message}`);
    }
};

/**
 * Given a raw YouTube video item, detect if it introduces a new game genre.
 * If detected and not in DB, auto-create it.
 * Returns the tag-detected genre or null.
 */
const processVideoForGenreDiscovery = async (title, tags = []) => {
    let detected = detectGenreFromTags(title, tags);

    if (!detected) {
        // Frequency-based discovery for unknown tags & title keywords
        const keywords = [
            ...tags,
            ...title.split(/[^a-zA-Z0-9]+/).filter(w => w.length > 3)
        ];

        for (const tag of keywords) {
            const normalized = tag.toLowerCase().trim();
            if (normalized.length < 4 || normalized.length > 20 || TAG_STOP_WORDS.has(normalized)) continue;
            // Ignore common numbers like "Part 1"
            if (/^\d+$/.test(normalized)) continue;

            const count = (tagCounts.get(normalized) || 0) + 1;
            tagCounts.set(normalized, count);

            if (count >= DISCOVERY_THRESHOLD) {
                // Potential new genre found!
                detected = tag.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                logger.info(`[GenreDiscovery] Found frequent unknown keyword: "${detected}" - Promoting to genre`);
                break;
            }
        }
    }

    if (!detected) return null;

    // Check if this genre already exists in DB (by name OR slug)
    const slug = detected.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const res = await query(`SELECT id FROM genre_prompts WHERE genre = $1 OR slug = $2`, [detected, slug]);
    if (res.rowCount === 0) {
        await autoCreateGenre(detected);
    }

    return detected;
};

module.exports = {
    loadGenrePrompts,
    detectGenreFromTags,
    autoCreateGenre,
    processVideoForGenreDiscovery,
    YT_CATEGORY_MAP,
};
