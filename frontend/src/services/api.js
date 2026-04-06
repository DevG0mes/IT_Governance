import axios from 'axios';

// Vazio = mesma origem + proxy Vite (`/api` → Node). Evita mixed content se o front for HTTPS.
// API em outro host: VITE_API_URL=http://34.95.207.232:3000 (build) ou VITE_PROXY_TARGET no vite.
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Prefixa /api nas rotas relativas (/licenses → /api/licenses). Rotas já em /api/ não alteram.
api.interceptors.request.use((config) => {
  const u = config.url;
  if (typeof u === 'string' && u.startsWith('/') && !u.startsWith('/api')) {
    config.url = '/api' + u;
  }
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// 3. INTERCEPTOR DE VOLTA (Tratamento Global de Erros)
api.interceptors.response.use(
  (response) => response, 
  (error) => {
    // A) Tratamento de Timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('🚨 Timeout: O servidor do Google Cloud demorou demais para responder.');
    }
    
    // B) Tratamento de Servidor Indisponível (Container fora do ar)
    if (error.response && error.response.status === 503) {
      console.error('🚨 Erro 503: O container da API pode estar reiniciando no GCP.');
    }

    // C) Tratamento de Token Expirado (Segurança de Governança)
    if (error.response && error.response.status === 401) {
       console.warn('🔒 Sessão expirada ou acesso negado. Redirecionando para login...');
       localStorage.removeItem('token');
       window.location.href = '/'; // Redireciona para a tela inicial
    }

    return Promise.reject(error);
  }
);

export default api;