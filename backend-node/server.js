// Arquivo: server.js
const express = require('express');
const cors = require('cors');
const timeout = require('connect-timeout'); 
const compression = require('compression'); 
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
require('dotenv').config();

// Conexão com o Banco (Caminho relativo à raiz)
const { connectDatabase } = require('./config/db');

// Middlewares de Segurança
const verificarToken = require('./middlewares/auth'); 
const verificarAdmin = require('./middlewares/admin'); 

// Rotas (Certifique-se que os arquivos existem nestes caminhos)
const authRoutes = require('./src/routes/auth'); 
const employeeRoutes = require('./src/routes/employees'); 
const assetRoutes = require('./src/routes/assets'); 
const licenseRoutes = require('./src/routes/licenses'); 
const contractRoutes = require('./src/routes/contracts'); 
const catalogRoutes = require('./src/routes/catalog');    
const auditRoutes = require('./src/routes/audit'); 
const userRoutes = require('./src/routes/users'); 

const app = express();

// --- 1. PROTEÇÃO DE INFRAESTRUTURA ---
app.use(helmet()); 
app.use(timeout('15s')); // Aumentado para 15s para dar folga ao PDF Parse
app.use(compression()); 

// --- 2. CONFIGURAÇÃO DE CORS (Ajustado para produção) ---
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); // Limite de JSON aumentado para logs/lotes
app.use(express.urlencoded({ extended: true }));

// --- 3. RATE LIMIT (Proteção contra Brute Force) ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, // Aumentado para 10 para evitar bloqueios por erro do usuário
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true, 
  legacyHeaders: false,
});

// --- 4. DEFINIÇÃO DAS ROTAS ---

// Rota de Health Check (Sempre aberta)
app.get('/api/health', (req, res) => res.json({ status: 'OK', server: 'PSI GovTI Node.js' }));

// Rotas de Autenticação (Login/Setup)
app.use('/api/auth', loginLimiter, authRoutes); 
// Nota: Se o seu authRoutes já tem router.post('/login'), a URL será /api/auth/login

// --- 🛡️ FILTRO DE SEGURANÇA GLOBAL (Daqui para baixo precisa de Token) ---
app.use('/api', (req, res, next) => {
    // Pula a verificação se for rota de login ou health
    if (req.path.includes('/auth') || req.path.includes('/health')) return next();
    verificarToken(req, res, next);
});

// Rotas Protegidas
app.use('/api/assets', assetRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/catalog', catalogRoutes);

// Acesso Restrito ao Admin
app.use('/api/users', verificarAdmin, userRoutes);

// --- 5. TRATAMENTO DE ERROS (O "Pára-raios") ---
app.use((err, req, res, next) => {
  if (req.timedout) {
    return res.status(503).json({ error: 'Timeout: O servidor demorou muito para responder.' });
  }
  console.error('❌ Erro Crítico:', err.stack);
  res.status(500).json({ error: 'Erro interno no servidor Node.js', details: err.message });
});

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connectDatabase();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 PSI GovTI Online na porta ${PORT}`);
    });

    // Ajustes para evitar o erro "OS can't spawn worker thread"
    server.keepAliveTimeout = 60000; 
    server.headersTimeout = 65000; 

  } catch (err) {
    console.error('❌ Falha catastrófica no boot:', err);
    process.exit(1); // Força o encerramento para a Hostinger reiniciar o processo limpo
  }
};

startServer();