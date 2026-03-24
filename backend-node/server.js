// Arquivo: server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDatabase } = require('./config/db');

// Ferramentas e Segurança
const { sanitizeBody } = require('./utils/sanitizer');
const verificarToken = require('./middlewares/auth'); 
const verificarAdmin = require('./middlewares/admin'); 

// Rotas
const authRoutes = require('./routes/auth'); 
const employeeRoutes = require('./routes/employees'); 
const assetRoutes = require('./routes/assets'); 
const licenseRoutes = require('./routes/licenses'); 
const contractRoutes = require('./routes/contracts'); 
const catalogRoutes = require('./routes/catalog');    
const auditRoutes = require('./routes/audit'); 
const userRoutes = require('./routes/users'); 

const app = express();

// --- CONFIGURAÇÃO DE CORS (Idêntico ao Go) ---
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json());
app.use(sanitizeBody); 

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// ==========================================
// 🌐 SETUP ROUTER (Espelho do router.go)
// ==========================================

// 🔓 ROTA PÚBLICA
app.use('/api', authRoutes); // Contém o /login

// 🛡️ MIDDLEWARE DE SEGURANÇA (Intercepta tudo daqui pra baixo)
app.use('/api', verificarToken);

// --- Rotas de Módulos ---
app.use('/api/assets', assetRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/contracts', contractRoutes); // Agora possui o /analyze-pdf
app.use('/api/audit-logs', auditRoutes);
app.use('/api/catalog', catalogRoutes);

// 👑 BLOCO DE ACESSO RESTRITO (Apenas Administradores)
// Como no Go você criou um admin.Group("/"), aqui usamos o app.use nas rotas vitais
app.use('/api/users', verificarAdmin, userRoutes);

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 API GovTI Node.js rodando na porta ${PORT} (Arquitetura Go Espelhada)!`);
  });
};

startServer();