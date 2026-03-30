import axios from 'axios';
import { API_BASE_URL } from '../utils/helpers'; 

// 1. CRIAÇÃO DA INSTÂNCIA BLINDADA (AWS EC2 Edition)
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 🚨 REGRA DE OURO: Se a AWS não responder em 10s, o React cancela para liberar conexão!
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
      console.error('🚨 Timeout: O servidor AWS demorou demais para responder.');
    }
    
    // B) Tratamento de Servidor Indisponível (Container fora do ar)
    if (error.response && error.response.status === 503) {
      console.error('🚨 Erro 503: O container da API pode estar reiniciando.');
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