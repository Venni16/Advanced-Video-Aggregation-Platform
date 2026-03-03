import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 12000,
    headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — unwrap data, surface errors
api.interceptors.response.use(
    (res) => res.data,
    (err) => {
        const msg =
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            'Unknown error';
        return Promise.reject(new Error(msg));
    }
);

export default api;
