import axios from 'axios';

export const TOKEN_STORAGE_KEY = '@PlataformaEJA:token';
export const UNAUTHORIZED_EVENT = 'eja:unauthorized';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Só um 401 de requisição autenticada indica sessão expirada; no login, 401 é credencial incorreta.
        if (error.response?.status === 401 && error.config?.headers?.Authorization) {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
        }
        return Promise.reject(error);
    },
);

export default api;
