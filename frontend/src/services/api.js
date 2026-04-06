import axios from 'axios';
// 🚨 A importação do 'helpers' foi removida para matar o IP antigo na raiz

// 1. CRIAÇÃO DA INSTÂNCIA BLINDADA (Google Cloud Edition)
// Tenta ler o .env de produção do Vite. Se falhar, aciona o Fallback de Segurança.
const API_URL_OFICIAL = import.meta.env.VITE_API_URL || 'http://34.95.207.232:3000';

const api = axios.create({
  baseURL: API_URL_OFICIAL,
  timeout: 10000, // 🚨 REGRA DE OURO: Se o GCP não responder em 10s, o React cancela para liberar conexão!
  headers: {
    'Content-Type': 'application/json'
  }
});

// 2. INTERCEPTOR DE IDA (Segurança e Autenticação)
api.interceptors.request.use((config) => {
  // Recupera o token do localStorage
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