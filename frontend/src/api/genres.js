import api from './api';

/** GET /api/genres */
export const getGenres = () => api.get('/genres');
