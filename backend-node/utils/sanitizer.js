// Arquivo: utils/sanitizer.js
const xss = require('xss');

// ==========================================
// 1. SEGURANÇA (Anti-Injeção e Scripts Maliciosos)
// ==========================================

// Função para limpar strings (Remove tags <script>, etc)
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return xss(input.trim());
  }
  return input;
};

// Middleware para limpar todo o corpo (body) da requisição automaticamente
const sanitizeBody = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      req.body[key] = sanitizeInput(req.body[key]);
    }
  }
  next();
};

// ==========================================
// 2. PADRONIZAÇÃO DE DADOS (Traduzido do Go)
// ==========================================

// StandardizeText remove espaços duplos e padroniza o texto
const standardizeText = (input) => {
  if (!input || typeof input !== 'string') return input;
  // .trim() tira as pontas. O replace(/\s+/g, ' ') encontra qualquer 
  // sequência de 2 ou mais espaços seguidos e troca por apenas 1.
  return input.trim().replace(/\s+/g, ' ');
};

// StandardizeEmail garante que e-mails sejam sempre minúsculos e sem espaços
const standardizeEmail = (email) => {
  if (!email || typeof email !== 'string') return email;
  return email.trim().toLowerCase();
};

// StandardizeAssetIdentifier remove espaços e força caixa alta para IDs (Patrimônio/Serial)
const standardizeAssetIdentifier = (id) => {
  if (!id || typeof id !== 'string') return id;
  return id.trim().toUpperCase();
};

module.exports = { 
  sanitizeInput, 
  sanitizeBody,
  standardizeText,
  standardizeEmail,
  standardizeAssetIdentifier
};