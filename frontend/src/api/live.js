import api from './api';

/** GET /api/live */
export const getLiveStreams = () => api.get('/live');
