// Arquivo: server.js
process.env.UV_THREADPOOL_SIZE = 2;

const express = require('express');
const cors = require('cors');
const timeout = require('connect-timeout'); 
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

// --- 1. CONFIGURAÇÃO DE CORS (PRIMEIRO DE TUDO) ---
// Movido para o topo para garantir que o Preflight (OPTIONS) responda antes de qualquer trava
app.use(cors({
  origin: 'http://34.95.207.232', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  credentials: true
}));

// Resposta imediata para requisições OPTIONS
app.options(/^(.*)$/, cors()); 

// --- 2. PROTEÇÃO E PERFORMANCE ---
app.use(helmet({
  crossOriginResourcePolicy: false, 
})); 
app.use(timeout('15s')); 
app.use(compression()); 
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true }));

// --- 3. RATE LIMIT ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true, 
  legacyHeaders: false,
});

// --- 4. DEFINIÇÃO DAS ROTAS ---

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'OK', server: 'PSI GovTI no Google Cloud' }));

app.use('/api', loginLimiter, authRoutes); 

app.use('/api', (req, res, next) => {
    const publicPaths = ['/login', '/setup-admin', '/health'];
    if (publicPaths.some(path => req.path.includes(path))) {
        return next();
    }
    verificarToken(req, res, next);
});

app.use('/api/assets', assetRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/users', verificarAdmin, userRoutes);

app.use((err, req, res, next) => {
  if (req.timedout) {
    return res.status(503).json({ error: 'Timeout: O servidor demorou muito para responder.' });
  }
  console.error('❌ Erro Crítico:', err.stack);
  res.status(500).json({ error: 'Erro interno no servidor Node.js', details: err.message });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 PSI GovTI Online na porta ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Erro no boot:', err);
  }
};

startServer();