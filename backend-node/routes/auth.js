// Arquivo: routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../config/db');

const router = express.Router();

// Mesma chave secreta para manter a compatibilidade com o Go
const jwtSecretKey = process.env.JWT_SECRET || "psi_energy_govti_secret_2026";

// ==========================================
// ROTA 1: LOGIN NORMAL
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).send(JSON.stringify({ error: 'Campos obrigatórios' }));
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).send(JSON.stringify({ error: 'Credenciais inválidas' }));
    }

    // Compara a senha digitada com o Hash do banco
    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).send(JSON.stringify({ error: 'Credenciais inválidas' }));
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

    // ==========================================
    // BLINDAGEM: Forçando o cabeçalho JSON e o formato
    // ==========================================
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({
      token: token,
      data: user 
    }));

  } catch (error) {
    console.error("Erro interno no login:", error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify({ error: 'Erro interno no servidor' }));
  }
}); // <-- AQUI ENCERRA A ROTA DE LOGIN


// ==========================================
// ROTA 2: TEMPORÁRIA PARA CRIAR O ADMIN 
// ==========================================
router.get('/setup-admin', async (req, res) => {
  try {
    // Força a sincronização da tabela para garantir que colunas como permissions_json existam
    await User.sync();

    const adminEmail = 'admin@psi.com.br';
    const adminExists = await User.findOne({ where: { email: adminEmail } });
    
    if (adminExists) {
      return res.send(`⚠️ O Admin ${adminEmail} já existe no banco! Tente logar com admin123`);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await User.create({
      nome: 'Administrador Root',
      email: adminEmail,
      senha: hashedPassword,
      cargo: 'Administrator',
      permissions_json: JSON.stringify({
        "dashboard":"edit","inventory":"edit","licenses":"edit",
        "contracts":"edit","catalog":"edit","employees":"edit",
        "maintenance":"edit","offboarding":"edit","export":"edit",
        "import":"edit","admin":"edit"
      })
    });

    res.send('✅ Admin criado com sucesso! Volte para a tela de login e use admin@psi.com.br e admin123');
  } catch (error) {
    res.status(500).send('❌ Erro ao criar admin: ' + error.message);
  }
});

module.exports = router;