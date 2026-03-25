// Arquivo: server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDatabase } = require('./config/db');

// Ferramentas e Segurança
const { sanitizeBody } = require('./utils/sanitizer');
const verificarToken = require('./middlewares/auth'); 
const verificarAdmin = require('./middlewares/admin'); 

// Rotas (Certifique-se que os nomes dos arquivos na pasta 'routes' são exatamente esses)
const authRoutes = require('./routes/auth'); 
const employeeRoutes = require('./routes/employees'); 
const assetRoutes = require('./routes/assets'); 
const licenseRoutes = require('./routes/licenses'); 
const contractRoutes = require('./routes/contracts'); 
const catalogRoutes = require('./routes/catalog');    
const auditRoutes = require('./routes/audit'); 
const userRoutes = require('./routes/users'); 

const app = express();

// --- CONFIGURAÇÃO DE CORS ---
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json());
// Comente o sanitizer temporariamente se o erro 503 persistir para testar
app.use(sanitizeBody); 

// Rota de Health Check (Mova para antes de qualquer middleware de segurança!)
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Servidor PSI Energy Online' }));

// 🔓 ROTAS PÚBLICAS
app.use('/api', authRoutes); // Login deve ser acessível sem token!

// 🛡️ MIDDLEWARE DE SEGURANÇA (Só bloqueia o que vem abaixo)
app.use('/api', verificarToken);

// --- Rotas de Módulos ---
app.use('/api/assets', assetRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/catalog', catalogRoutes);

// 👑 BLOCO DE ACESSO RESTRITO
app.use('/api/users', verificarAdmin, userRoutes);

// 🚨 TRATAMENTO GLOBAL DE ERROS (Evita que o servidor morra e dê 503)
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno no servidor Node.js', details: err.message });
});

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 API GovTI rodando na porta ${PORT}!`);
    });
  } catch (err) {
    console.error('Falha ao iniciar o servidor:', err);
    // Não damos process.exit(1) aqui para o log poder ser lido no painel
  }
};

startServer();