import axios, { type AxiosInstance } from 'axios';

// Vazio = mesma origem + proxy Vite (`/api` → Node). Evita mixed content se o front for HTTPS.
// API em outro host: VITE_API_URL=http://34.95.207.232:3000 (build) ou VITE_PROXY_TARGET no vite.
const API_BASE = import.meta.env.VITE_API_URL || '';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Prefixa /api nas rotas relativas (/licenses → /api/licenses). Rotas já em /api/ não alteram.
api.interceptors.request.use(
  (config) => {
    const u = config.url;
    if (typeof u === 'string' && u.startsWith('/') && !u.startsWith('/api')) {
      config.url = '/api' + u;
    }
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || String(error.message || '').includes('timeout')) {
      console.error('Timeout: o servidor demorou demais para responder.');
    }
    if (error.response && error.response.status === 503) {
      console.error('Erro 503: a API pode estar reiniciando.');
    }
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;

