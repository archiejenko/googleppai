import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_BACKEND_URL || import.meta.env.VITE_API_URL;

if (!apiUrl && import.meta.env.PROD) {
    console.error('CRITICAL: VITE_API_URL is not set! API calls will fail.');
}

const api = axios.create({
    baseURL: apiUrl || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
