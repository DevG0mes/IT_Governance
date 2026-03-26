// Arquivo: server.js
const express = require('express');
const cors = require('cors');
const timeout = require('connect-timeout'); 
const compression = require('compression'); 
// 🚨 NOVO: Escudos de proteção
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
require('dotenv').config();
const { connectDatabase } = require('./config/db');

// Ferramentas e Segurança
const { sanitizeBody } = require('./utils/sanitizer');
const verificarToken = require('./middlewares/auth'); 
const verificarAdmin = require('./middlewares/admin'); 

// Rotas
const authRoutes = require('./src/routes/auth'); 
const employeeRoutes = require('./src/routes/employees'); 
const assetRoutes = require('./src/routes/assets'); 
const licenseRoutes = require('./src/routes/licenses'); 
const contractRoutes = require('./src/routes/contracts'); 
const catalogRoutes = require('./src/routes/catalog');    
const auditRoutes = require('./src/routes/audit'); 
const userRoutes = require('./src/routes/users'); 

const app = express();

// --- PROTEÇÃO DE CABEÇALHOS (HELMET) ---
// Esconde que a API é feita em Node/Express e protege contra XSS/Clickjacking
app.use(helmet()); 

// --- PROTEÇÃO DE PROCESSOS (HOSTINGER NPROC) ---
app.use(timeout('10s'));

// --- COMPRESSÃO DE DADOS ---
app.use(compression()); 

// --- CONFIGURAÇÃO DE CORS ---
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json());

// --- MIDDLEWARE DE BLINDAGEM DE CONEXÃO ---
app.use((req, res, next) => {
  res.setHeader('Connection', 'close');
  if (!req.timedout) next();
});

app.use(sanitizeBody); 

// Rota de Health Check
app.get('/api/health', (req, res) => {
  if (req.timedout) return;
  res.json({ status: 'OK', message: 'Servidor PSI Energy Online' });
});

// --- RATE LIMIT (TRAVA CONTRA FORÇA BRUTA) ---
// Se um mesmo IP tentar fazer Login 5 vezes seguidas e errar, fica bloqueado por 15 minutos.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limite de 5 requisições por IP na janela de tempo
  message: { error: "Muitas tentativas de login fracassadas. Por segurança, tente novamente em 15 minutos." },
  standardHeaders: true, 
  legacyHeaders: false,
});

// Aplica a trava EXCLUSIVAMENTE na rota de login antes de chamar as rotas públicas
app.use('/api/login', loginLimiter);

// 🔓 ROTAS PÚBLICAS
app.use('/api', authRoutes);

// 🛡️ MIDDLEWARE DE SEGURANÇA GLOBAL
app.use('/api', verificarToken);

// --- Rotas de Módulos (Protegidas) ---
app.use('/api/assets', assetRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/catalog', catalogRoutes);

// 👑 BLOCO DE ACESSO RESTRITO
app.use('/api/users', verificarAdmin, userRoutes);

// 🚨 TRATAMENTO GLOBAL DE ERROS E TIMEOUTS
app.use((err, req, res, next) => {
  if (req.timedout) {
    return res.status(503).json({ 
      error: 'Tempo limite da requisição excedido. Processo liberado por segurança.' 
    });
  }

  console.error('Erro não tratado:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Erro interno no servidor Node.js', details: err.message });
  }
});

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connectDatabase();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 API GovTI rodando na porta ${PORT}!`);
    });

    // Ajustes de rede nativos para Hostinger
    server.keepAliveTimeout = 0; 
    server.headersTimeout = 15000; 
    server.timeout = 10000; 

  } catch (err) {
    console.error('Falha ao iniciar o servidor:', err);
  }
};

startServer();