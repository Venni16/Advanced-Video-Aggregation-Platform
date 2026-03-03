const axios = require('axios');
const logger = require('../config/logger');
const { query } = require('../config/db');

const YT_BASE = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;
const MAX_RESULTS = parseInt(process.env.YOUTUBE_MAX_RESULTS, 10) || 50;

/**
 * Specific channel IDs or @handles to discover from
 */
let DISCOVERY_CHANNELS = (process.env.CHANNEL_IDS || '').split(',').filter(id => id.trim());

/**
 * Cache for handle -> channelId mapping to save quota
 */
const handleCache = new Map();

/**
 * Resolve a YouTube handle (e.g. @tamilgaming) to a Channel ID
 * @param {string} handle 
 * @returns {Promise<string|null>}
 */
const getChannelIdByHandle = async (handle) => {
    const cleanedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    if (handleCache.has(cleanedHandle)) return handleCache.get(cleanedHandle);

    try {
        const resp = await axios.get(`${YT_BASE}/channels`, {
            params: {
                forHandle: cleanedHandle,
                part: 'id',
                key: API_KEY,
            },
            timeout: 10000
        });
        await trackQuota(1);

        const id = resp.data.items?.[0]?.id;
        if (id) {
            handleCache.set(cleanedHandle, id);
            logger.info(`[YouTube] Resolved handle ${cleanedHandle} to ID: ${id}`);
            return id;
        }
        return null;
    } catch (err) {
        logger.warn(`Failed to resolve handle ${cleanedHandle}: ${err.message}`);
        return null;
    }
};

/**
 * Get the "Uploads" playlist ID for a specific channel
 */
const getChannelUploadsPlaylistId = async (channelId) => {
    try {
        const resp = await axios.get(`${YT_BASE}/channels`, {
            params: {
                id: channelId,
                part: 'contentDetails',
                key: API_KEY,
            }
        });
        await trackQuota(1);
        return resp.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    } catch (err) {
        logger.warn(`Failed to get uploads playlist for ${channelId}: ${err.message}`);
        return null;
    }
};

/**
 * Increment YouTube API quota usage in DB
 */
const trackQuota = async (units) => {
    try {
        await query(
            `INSERT INTO quota_usage (date, units_used) VALUES (CURRENT_DATE, $1)
       ON CONFLICT (date) DO UPDATE SET units_used = quota_usage.units_used + $1`,
            [units]
        );
    } catch (err) {
        logger.warn('Failed to track quota usage:', err.message);
    }
};

/**
 * Search YouTube for Tamil gaming videos
 * @param {string} queryStr - Search query
 * @param {string} pageToken - Pagination token
 * @param {string} eventType - 'video'|'live'|'upcoming'
 */
const searchVideos = async (queryStr = 'tamil gaming', pageToken = null, eventType = null, channelId = null) => {
    // If we're searching for all videos in a specific channel, we use a broader query
    const params = {
        part: 'snippet',
        type: 'video',
        maxResults: Math.min(MAX_RESULTS, 50),
        order: 'date',
        safeSearch: 'none',
        key: API_KEY,
    };

    if (queryStr && queryStr !== ' ') {
        params.q = queryStr;
    } else if (!channelId || channelId === 'all') {
        params.q = 'tamil gaming'; // Default fallback
    }

    // Only apply language/region restrictions for global search
    if (!channelId || channelId === 'all') {
        params.relevanceLanguage = 'ta';
        params.regionCode = 'IN';
    }

    if (pageToken) params.pageToken = pageToken;
    if (eventType) params.eventType = eventType;
    if (channelId && channelId !== 'all') params.channelId = channelId;
    if (params.channelId === 'all') delete params.channelId; // Support global discovery if needed

    const resp = await axios.get(`${YT_BASE}/search`, { params, timeout: 10000 });
    await trackQuota(100); // search costs 100 units

    return {
        items: resp.data.items || [],
        nextPageToken: resp.data.nextPageToken,
        totalResults: resp.data.pageInfo?.totalResults,
    };
};

/**
 * Fetch items from a specific playlist (Uploads)
 */
const fetchPlaylistItems = async (playlistId, pageToken = null) => {
    const params = {
        part: 'snippet',
        playlistId: playlistId,
        maxResults: 50,
        key: API_KEY,
    };
    if (pageToken) params.pageToken = pageToken;

    const resp = await axios.get(`${YT_BASE}/playlistItems`, { params });
    await trackQuota(1); // playlistItems cost 1 unit

    return {
        items: resp.data.items || [],
        nextPageToken: resp.data.nextPageToken,
    };
};

/**
 * Fetch detailed video metadata for up to 50 video IDs
 * @param {string[]} videoIds
 */
const getVideoDetails = async (videoIds) => {
    if (!videoIds.length) return [];

    const resp = await axios.get(`${YT_BASE}/videos`, {
        params: {
            part: 'snippet,contentDetails,statistics,liveStreamingDetails',
            id: videoIds.join(','),
            key: API_KEY,
        },
        timeout: 10000,
    });
    await trackQuota(videoIds.length); // 1 unit per video

    return resp.data.items || [];
};

/**
 * Fetch currently live Tamil gaming streams
 */
const fetchLiveStreams = async () => {
    const results = [];
    // Resolve handles to IDs if necessary
    const targets = [];
    for (const id of (DISCOVERY_CHANNELS.length ? DISCOVERY_CHANNELS : ['all'])) {
        if (id.startsWith('@')) {
            const resolved = await getChannelIdByHandle(id);
            if (resolved) targets.push(resolved);
        } else {
            targets.push(id);
        }
    }

    for (const channelId of targets) {
        try {
            const { items } = await searchVideos('', null, 'live', channelId);
            results.push(...items);
        } catch (err) {
            logger.warn(`Live search failed for channel "${channelId}": ${err.message}`);
        }
    }
    // Deduplicate by videoId
    const seen = new Set();
    return results.filter(item => {
        const id = item.id?.videoId;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });
};

/**
 * Run a full discovery sweep across all Tamil gaming queries
 * INTERLEAVED for perfect balance between channels.
 */
const discoverAllVideos = async () => {
    const allVideoIds = new Set();
    const snippets = {};

    logger.info('[YouTube] Starting BALANCED discovery sweep...');

    // Resolve handles and get Uploads Playlist IDs
    const channelQueues = [];
    for (const rawId of (DISCOVERY_CHANNELS.length ? DISCOVERY_CHANNELS : ['all'])) {
        let channelId = rawId;
        if (rawId.startsWith('@')) {
            channelId = await getChannelIdByHandle(rawId);
        }

        if (channelId && channelId !== 'all') {
            const playlistId = await getChannelUploadsPlaylistId(channelId);
            if (playlistId) {
                channelQueues.push({
                    id: channelId,
                    playlistId: playlistId,
                    pageToken: null,
                    fetched: 0,
                    done: false
                });
            }
        }
    }

    // Round-robin fetching to ensure perfect balance
    let activeQueuesCount = channelQueues.length;
    while (activeQueuesCount > 0) {
        let madeProgress = false;

        for (const queue of channelQueues) {
            if (queue.done || queue.fetched >= MAX_RESULTS) continue;

            try {
                const { items, nextPageToken } = await fetchPlaylistItems(queue.playlistId, queue.pageToken);

                if (items.length === 0) {
                    queue.done = true;
                    activeQueuesCount--;
                    continue;
                }

                for (const item of items) {
                    const videoId = item.snippet?.resourceId?.videoId;
                    if (videoId && !allVideoIds.has(videoId)) {
                        allVideoIds.add(videoId);
                        snippets[videoId] = item.snippet;
                    }
                }

                queue.fetched += items.length;
                queue.pageToken = nextPageToken;
                madeProgress = true;

                if (!nextPageToken || queue.fetched >= MAX_RESULTS) {
                    queue.done = true;
                    activeQueuesCount--;
                }
            } catch (err) {
                logger.warn(`Balanced discovery failed for queue ${queue.id}: ${err.message}`);
                queue.done = true;
                activeQueuesCount--;
            }
        }

        if (!madeProgress) break;
    }

    // Fallback if no specific channels were provided (global search)
    if (channelQueues.length === 0) {
        const { items } = await searchVideos('tamil gaming');
        for (const item of items) {
            const id = item.id?.videoId;
            if (id) {
                allVideoIds.add(id);
                snippets[id] = item.snippet;
            }
        }
    }

    const ids = Array.from(allVideoIds);
    logger.info(`[YouTube] Balanced discovery found ${ids.length} total videos across ${channelQueues.length} channels`);

    // Fetch details in batches of 50
    const details = [];
    for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        try {
            const items = await getVideoDetails(batch);
            details.push(...items);
        } catch (err) {
            logger.warn(`Detail fetch failed for batch ${i}–${i + 50}: ${err.message}`);
        }
    }

    return details;
};

/**
 * Parse YouTube ISO 8601 live broadcast status
 */
const parseLiveStatus = (item) => {
    const liveBroadcastContent = item.snippet?.liveBroadcastContent;
    if (liveBroadcastContent === 'live') return 'live';
    if (liveBroadcastContent === 'upcoming') return 'upcoming';
    if (item.liveStreamingDetails?.actualEndTime) return 'ended';
    return 'none';
};

/**
 * Format a raw YouTube API item into our DB schema shape
 */
const formatVideoRecord = (item) => {
    const snippet = item.snippet || {};
    const stats = item.statistics || {};
    const isShort = snippet.title?.includes('#shorts') || snippet.description?.includes('#shorts');

    return {
        video_id: typeof item.id === 'string' ? item.id : (item.id?.videoId || item.snippet?.resourceId?.videoId),
        title: snippet.title || '',
        description: (snippet.description || '').substring(0, 5000),
        thumbnail_url:
            snippet.thumbnails?.maxres?.url ||
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            '',
        channel_name: snippet.channelTitle || '',
        channel_id: snippet.channelId || '',
        live_status: parseLiveStatus(item),
        view_count: parseInt(stats.viewCount, 10) || 0,
        like_count: parseInt(stats.likeCount, 10) || 0,
        comment_count: parseInt(stats.commentCount, 10) || 0,
        duration: item.contentDetails?.duration || '',
        published_at: snippet.publishedAt || null,
        is_short: isShort,
        tags: snippet.tags || [],
    };
};

module.exports = {
    searchVideos,
    getVideoDetails,
    fetchLiveStreams,
    discoverAllVideos,
    formatVideoRecord,
};
