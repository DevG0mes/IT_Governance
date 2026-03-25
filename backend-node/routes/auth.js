// Arquivo: routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../config/db'); // Centralizado no db.js

const router = express.Router();

// Mesma chave secreta para manter a compatibilidade com o Go
const jwtSecretKey = process.env.JWT_SECRET || "psi_energy_govti_secret_2026";

// ==========================================
// ROTA 1: LOGIN (Pública)
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    // Busca o usuário pelo e-mail
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Compara a senha digitada com o Hash do banco
    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // JWT IDENTICO AO GO (Valid. 12h e os mesmos Claims)
    const token = jwt.sign(
      { 
        user_id: user.id, 
        email: user.email, 
        cargo: user.cargo 
      },
      jwtSecretKey,
      { expiresIn: '12h' }
    );

    // ✅ RESPOSTA LIMPA: O Frontend recebe o token e os dados do usuário (user_id, cargo, etc)
    return res.status(200).json({
      token: token,
      data: user 
    });

  } catch (error) {
    console.error("❌ Erro interno no login:", error.message);
    return res.status(500).json({ error: 'Erro interno no servidor de autenticação' });
  }
});

// ==========================================
// ROTA 2: SETUP DE EMERGÊNCIA (Cria o Admin Root)
// ==========================================
router.get('/setup-admin', async (req, res) => {
  try {
    const adminEmail = 'admin@psi.com.br';
    const adminExists = await User.findOne({ where: { email: adminEmail } });
    
    if (adminExists) {
      return res.send(`⚠️ O Admin ${adminEmail} já existe no banco! Tente logar com admin123`);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Criando com a coluna correta 'permissionsJSON' definida no db.js
    await User.create({
      nome: 'Administrador Root',
      email: adminEmail,
      senha: hashedPassword,
      cargo: 'Administrator',
      permissionsJSON: JSON.stringify({
        "dashboard":"edit","inventory":"edit","licenses":"edit",
        "contracts":"edit","catalog":"edit","employees":"edit",
        "maintenance":"edit","offboarding":"edit","export":"edit",
        "import":"edit","admin":"edit"
      })
    });

    res.send('✅ Admin criado com sucesso! Use admin@psi.com.br / admin123');
  } catch (error) {
    console.error("❌ Erro no setup-admin:", error.message);
    res.status(500).send('❌ Erro ao criar admin: ' + error.message);
  }
});

module.exports = router;