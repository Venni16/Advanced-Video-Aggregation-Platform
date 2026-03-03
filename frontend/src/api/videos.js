import api from './api';

/** GET /api/videos */
export const getVideos = ({ genre, page = 1, limit = 24, search, live } = {}) => {
    const params = { page, limit };
    if (genre && genre !== 'All') params.genre = genre;
    if (search) params.search = search;
    if (live) params.live = true;
    return api.get('/videos', { params });
};

/** GET /api/videos/:videoId */
export const getVideoById = (videoId) => api.get(`/videos/${videoId}`);

/** GET /api/search?q=... */
export const searchVideos = ({ q, page = 1, limit = 24 }) =>
    api.get('/search', { params: { q, page, limit } });
