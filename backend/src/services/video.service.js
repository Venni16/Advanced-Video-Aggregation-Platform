const { query } = require('../config/db');
const logger = require('../config/logger');

/**
 * Upsert a video record into the database
 * @param {Object} video - Formatted video object
 */
const upsertVideo = async (video) => {
    const sql = `
    INSERT INTO videos (
      video_id, title, description, thumbnail_url, channel_name, channel_id,
      genre, classification_score, live_status, view_count, like_count,
      comment_count, duration, published_at, is_short, tags
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16
    )
    ON CONFLICT (video_id) DO UPDATE SET
      title               = EXCLUDED.title,
      description         = EXCLUDED.description,
      thumbnail_url       = EXCLUDED.thumbnail_url,
      genre               = EXCLUDED.genre,
      classification_score = EXCLUDED.classification_score,
      live_status         = EXCLUDED.live_status,
      view_count          = EXCLUDED.view_count,
      like_count          = EXCLUDED.like_count,
      comment_count       = EXCLUDED.comment_count,
      updated_at          = NOW()
    RETURNING video_id, genre, live_status
  `;

    const values = [
        video.video_id,
        video.title,
        video.description,
        video.thumbnail_url,
        video.channel_name,
        video.channel_id,
        video.genre || 'Others',
        video.classification_score || 0,
        video.live_status || 'none',
        video.view_count || 0,
        video.like_count || 0,
        video.comment_count || 0,
        video.duration || null,
        video.published_at || null,
        video.is_short || false,
        video.tags || [],
    ];

    const res = await query(sql, values);
    return res.rows[0];
};

/**
 * Check if a video already exists
 */
const videoExists = async (videoId) => {
    const res = await query('SELECT video_id FROM videos WHERE video_id = $1', [videoId]);
    return res.rowCount > 0;
};

/**
 * Get videos with filtering, pagination, and search
 */
const getVideos = async ({ genre, page = 1, limit = 24, search, liveOnly = false }) => {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (genre && genre !== 'All') {
        conditions.push(`genre = $${idx}`);
        values.push(genre);
        idx++;
    }

    if (liveOnly) {
        conditions.push(`live_status = 'live'`);
    }

    if (search) {
        conditions.push(
            `(search_vector @@ plainto_tsquery('english', $${idx}) OR title ILIKE $${idx + 1})`
        );
        values.push(search, `%${search}%`);
        idx += 2;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, countRes] = await Promise.all([
        query(
            `SELECT video_id, title, thumbnail_url, channel_name, genre,
              classification_score, live_status, view_count,
              published_at, is_short, duration
       FROM videos ${where}
       ORDER BY live_status = 'live' DESC, published_at DESC NULLS LAST
       LIMIT $${idx} OFFSET $${idx + 1}`,
            [...values, limit, offset]
        ),
        query(`SELECT COUNT(*) FROM videos ${where}`, values),
    ]);

    return {
        videos: dataRes.rows,
        total: parseInt(countRes.rows[0].count, 10),
        page,
        limit,
        hasMore: offset + dataRes.rows.length < parseInt(countRes.rows[0].count, 10),
    };
};

/**
 * Get genre statistics
 */
const getGenreStats = async () => {
    const res = await query(`
    SELECT genre, COUNT(*) as count,
           COUNT(*) FILTER (WHERE live_status = 'live') as live_count
    FROM videos
    GROUP BY genre
    ORDER BY count DESC
  `);
    return res.rows;
};

/**
 * Get currently live streams
 */
const getLiveStreams = async () => {
    const res = await query(`
    SELECT video_id, title, thumbnail_url, channel_name, genre,
           view_count, published_at, live_status
    FROM videos
    WHERE live_status = 'live'
    ORDER BY view_count DESC
    LIMIT 50
  `);
    return res.rows;
};

/**
 * Get single video by ID
 */
const getVideoById = async (videoId) => {
    const res = await query(
        `SELECT * FROM videos WHERE video_id = $1`,
        [videoId]
    );
    return res.rows[0] || null;
};

module.exports = { upsertVideo, videoExists, getVideos, getGenreStats, getLiveStreams, getVideoById };
