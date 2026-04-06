// ARQUIVO: server.js
// 🚨 REMOVIDO: process.env.UV_THREADPOOL_SIZE = 2; (Isso estava asfixiando a CPU do servidor e causando o ABORTED!)

const express = require('express');
const cors = require('cors');
const compression = require('compression'); 
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
require('dotenv').config();

const { connectDatabase } = require('./config/db');
const verificarToken = require('./middlewares/auth'); 
const verificarAdmin = require('./middlewares/admin'); 

const authRoutes = require('./src/routes/auth'); 
const employeeRoutes = require('./src/routes/employees'); 
const assetRoutes = require('./src/routes/assets'); 
const licenseRoutes = require('./src/routes/licenses'); 
const contractRoutes = require('./src/routes/contracts'); 
const catalogRoutes = require('./src/routes/catalog');     
const auditRoutes = require('./src/routes/audit'); 
const userRoutes = require('./src/routes/users'); 

const app = express();

// --- 1. CONFIGURAÇÃO DE CORS BLINDADA ---
// Aceita requisições sem frescura (ideal para APIs corporativas em VPS).
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

// --- 2. PROTEÇÃO E PERFORMANCE ---
app.use(helmet({ crossOriginResourcePolicy: false })); 
app.use(compression()); 
app.use(express.json({ limit: '50mb' })); // Aumentado para 50mb para a importação massiva de CSV e PDFs
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- 3. O NOVO "GUARDA DE TRÂNSITO" (Roteamento Universal) ---
// Se o React mandar /assets ou /api/assets, os dois vão funcionar perfeitamente sem travar a rota.
app.use((req, res, next) => {
    if (req.url.startsWith('/api/api')) req.url = req.url.replace('/api/api', '/api');
    else if (!req.url.startsWith('/api')) req.url = `/api${req.url}`;
    next();
});

// --- 4. RATE LIMIT (Liberdade para a Importação) ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10000, // Permite 10.000 requisições a cada 15 min para o Bulk Insert não dar erro 429
  message: { error: "Muitas requisições. Tente novamente mais tarde." },
  standardHeaders: true, 
  legacyHeaders: false,
});
app.use(globalLimiter);

// --- 5. DEFINIÇÃO DAS ROTAS ---
app.get('/api/health', (req, res) => res.json({ status: 'OK', server: 'PSI GovTI no Google Cloud', db: 'Conectado' }));

// Rotas Públicas (Login)
app.use('/api', authRoutes); 

// 🛡️ BARREIRA DE AUTENTICAÇÃO GLOBAL
app.use('/api', (req, res, next) => {
    const publicPaths = ['/login', '/setup-admin', '/health'];
    // Se a rota for pública, deixa passar
    if (publicPaths.some(path => req.path === path || req.path === `${path}/`)) {
        return next();
    }
    // Se não for, exige o Crachá (Token JWT)
    verificarToken(req, res, next);
});

// Rotas Privadas (Protegidas pelo JWT)
app.use('/api/assets', assetRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/catalog', catalogRoutes);

// Rota de Usuários (Dupla proteção: JWT + Admin)
app.use('/api/users', verificarAdmin, userRoutes);

// --- 6. TRATAMENTO DE ROTAS INEXISTENTES (O Anti-Hanging) ---
// Se não achou nenhuma rota acima, ele devolve 404 em vez de deixar a conexão pendurada infinitamente
app.use((req, res, next) => {
    res.status(404).json({ error: `A rota ${req.originalUrl} não existe neste servidor.` });
});

// --- 7. TRATAMENTO GLOBAL DE ERROS ---
app.use((err, req, res, next) => {
  console.error('❌ Erro Crítico Interno:', err.stack);
  res.status(500).json({ error: 'Erro interno no servidor Node.js', details: err.message });
});

// --- 8. INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 PSI GovTI Online, Blindado e de Alta Performance na porta ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Erro Fatal no boot do Servidor:', err);
  }
};

startServer();