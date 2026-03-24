// Arquivo: routes/users.js
const express = require('express');
const bcrypt = require('bcrypt');
const { User } = require('../config/db');

const router = express.Router();

// GET: Listar Usuários (Ocultando a senha, igual ao Select do Go)
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'nome', 'email', 'cargo', 'permissionsJSON', 'createdAt']
    });
    res.status(200).json({ data: users });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// POST: Criar novo Usuário
router.post('/', async (req, res) => {
  try {
    const input = req.body;

    // ==========================================
    // BCRYPT COM CUSTO 14 (A exata mesma força do Go)
    // ==========================================
    if (input.senha) {
      input.senha = await bcrypt.hash(input.senha, 14);
    }

    const newUser = await User.create(input);

    // Limpa a senha para não devolver pro React, igual ao input.Senha = ""
    const userJSON = newUser.toJSON();
    delete userJSON.senha;

    res.status(201).json({ data: userJSON });

  } catch (error) {
    // Captura o erro específico de e-mail duplicado (StatusConflict 409)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    res.status(400).json({ error: 'Dados inválidos' });
  }
});

// DELETE: Remover Usuário
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    // ==========================================
    // TRAVA DE SEGURANÇA CONTRA EXCLUSÃO DO ROOT
    // ==========================================
    if (id === '1') {
      return res.status(403).json({ error: 'Admin Root não pode ser excluído' });
    }

    await User.destroy({ where: { id } });
    res.status(200).json({ message: 'Usuário removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

module.exports = router;