import axios from 'axios';
// Importamos a URL centralizada que ajustamos antes
import { API_BASE_URL } from '../utils/helpers'; 

// 1. CRIAÇÃO DA INSTÂNCIA BLINDADA
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 🚨 REGRA DE OURO: Se o backend não responder em 10s, o React cancela o pedido e libera a conexão!
  headers: {
    'Content-Type': 'application/json'
  }
});

// 2. INTERCEPTOR DE IDA (Antes de enviar para a Hostinger)
api.interceptors.request.use((config) => {
  // Pega o token de onde você guarda (ajuste se for sessionStorage ou cookies)
  const token = localStorage.getItem('token'); 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// 3. INTERCEPTOR DE VOLTA (Tratamento Global de Gargalos)
api.interceptors.response.use(
  (response) => response, // Se deu certo, segue o jogo
  (error) => {
    // A) Tratamento de Timeout (Frontend desistiu de esperar)
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('🚨 Timeout: A requisição foi abortada para evitar gargalo.');
      // Opcional: Você pode importar o Swal aqui e dar um alerta sutil
    }
    
    // B) Tratamento de Hostinger Sufocada (NPROC estourado)
    if (error.response && error.response.status === 503) {
      console.error('🚨 Erro 503: Servidor recusou a conexão. Aguardando resfriamento.');
    }

    // C) Tratamento de Token Expirado (Segurança)
    if (error.response && error.response.status === 401) {
       console.warn('🔒 Sessão expirada. Redirecionando para login...');
       localStorage.removeItem('token');
       window.location.href = '/'; // Derruba o usuário para a tela inicial
    }

    return Promise.reject(error);
  }
);

export default api;