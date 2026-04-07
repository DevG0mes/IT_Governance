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
const { requirePermission } = require('./middlewares/permissions');

const authRoutes = require('./src/routes/auth'); 
const employeeRoutes = require('./src/routes/employees'); 
const assetRoutes = require('./src/routes/assets'); 
const licenseRoutes = require('./src/routes/licenses'); 
const contractRoutes = require('./src/routes/contracts'); 
const catalogRoutes = require('./src/routes/catalog');    
const auditRoutes = require('./src/routes/audit'); 
const userRoutes = require('./src/routes/users'); 
const finopsRoutes = require('./src/routes/finops');
const profilesRoutes = require('./src/routes/profiles');

const app = express();

// --- 1. CONFIGURAÇÃO DE CORS (PRIMEIRO DE TUDO) ---
// Origens separadas por vírgula; inclua dev local (Vite) se necessário.
// Preflight OPTIONS não envia Authorization — não pode passar por verificarToken.
const corsOrigins = (process.env.CORS_ORIGINS || 'http://34.95.207.232,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
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

// --- 2.5. MIDDLEWARE DE AUDITORIA E CORREÇÃO DE ROTAS (O "GUARDA DE TRÂNSITO") ---
app.use((req, res, next) => {
    // 1. Se o frontend mandar duplicado (/api/api/...), corta um deles
    if (req.url.startsWith('/api/api')) {
        req.url = req.url.replace('/api/api', '/api');
    }
    // 2. Se o frontend esquecer o /api (ex: /employees), adiciona na marra
    else if (!req.url.startsWith('/api')) {
        req.url = '/api' + req.url;
    }
    next();
});

// --- 3. RATE LIMIT ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5000, 
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true, 
  legacyHeaders: false,
});

// --- 4. DEFINIÇÃO DAS ROTAS ---

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'OK', server: 'PSI GovTI no Google Cloud' }));

app.use('/api', loginLimiter, authRoutes); 

app.use('/api', (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
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
app.use('/api/dashboard', finopsRoutes);
app.use('/api/users', requirePermission('settings', 'edit'), userRoutes);
app.use('/api/profiles', requirePermission('settings', 'edit'), profilesRoutes);

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