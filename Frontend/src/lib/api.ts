import axios from 'axios';
import { useAuthStore } from './store';
import { useNetworkStore } from './network';

// Create API instance
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors and network drops
api.interceptors.response.use(
    (response) => {
        if (!useNetworkStore.getState().isOnline) {
            useNetworkStore.getState().setOnline(true);
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        } else if (!error.response || error.code === 'ERR_NETWORK') {
            useNetworkStore.getState().setOnline(false);
        }
        return Promise.reject(error);
    }
);
