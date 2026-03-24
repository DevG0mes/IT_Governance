// Arquivo: routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../config/db');

const router = express.Router();
// Mesma chave secreta para manter a compatibilidade com o Go
const jwtSecretKey = process.env.JWT_SECRET || "psi_energy_govti_secret_2026";

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Campos obrigatórios' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Compara a senha digitada com o Hash do banco
    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // ==========================================
    // JWT IDENTICO AO GO (Valid. 12h e os mesmos Claims)
    // ==========================================
    const token = jwt.sign(
      { 
        user_id: user.id, 
        email: user.email, 
        cargo: user.cargo 
      },
      jwtSecretKey,
      { expiresIn: '12h' }
    );

    // Retorna a estrutura exata gin.H{"token": tokenString, "data": user}
    res.status(200).json({
      token: token,
      data: user
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

module.exports = router;