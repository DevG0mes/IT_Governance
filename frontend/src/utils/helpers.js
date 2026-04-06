// 1. URL BLINDADA (Google Cloud Edition)
// Tenta ler o .env de produção. Se falhar, usa o IP cravado do GCP.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://34.95.207.232:3000/api';

export const getAuthHeaders = () => {
  // 🚨 AJUSTE DE GOVERNANÇA: Padronizado para 'localStorage' e chave 'token'
  // para ficar 100% idêntico ao api.js e evitar bugs de sessão deslogando sozinha.
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const fetchWithAuth = (url, options = {}) => {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
};

export const parseCurrencyToFloat = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  let str = String(value).replace(/\u00a0/g, ' ').trim();
  str = str.replace(/R\$\s*/i, '').trim();
  if (str.includes('.') && str.includes(',')) str = str.replace(/\./g, '');
  str = str.replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const normalizeEmail = (email) => {
  return !email ? '' : email.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

/** Chave única de linha de licença para import (nome + plano + custo + qtd). */
export const licenseSkuKey = (nome, plano, custo, qtd) => {
  const c = Number(custo);
  const cNorm = Number.isFinite(c) ? Math.round(c * 100) / 100 : 0;
  return [
    (nome || '').toLowerCase().trim(),
    (plano || '').toLowerCase().trim(),
    cNorm,
    parseInt(qtd, 10) || 0,
  ].join('::');
};

/** Compara nomes de licença CSV vs cadastro (ex.: "for" vs "para", acentos). */
export const normalizeLicenseNameForMatch = (name) => {
  if (!name) return '';
  let s = String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\b(para|for)\b/g, '·');
  return s;
};