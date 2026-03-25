// Arquivo: routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
// ✅ Importação centralizada no db.js para evitar Erro 503
const { User } = require('../config/db');

// ==========================================
// 1. GET: Listar Usuários (Ocultando a senha)
// ==========================================
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      // Seleção exata de campos para o Dashboard (Igual ao Select do Go)
      attributes: ['id', 'nome', 'email', 'cargo', 'permissionsJSON', 'createdAt']
    });
    return res.status(200).json({ data: users });
  } catch (error) {
    console.error("❌ Erro ao buscar usuários:", error.message);
    return res.status(500).json({ error: 'Erro ao buscar usuários no banco' });
  }
});

// ==========================================
// 2. POST: Criar novo Usuário
// ==========================================
router.post('/', async (req, res) => {
  try {
    const input = req.body;

    // BCRYPT COM CUSTO 14 (Segurança Máxima PSI Energy)
    if (input.senha) {
      input.senha = await bcrypt.hash(input.senha, 14);
    }

    const newUser = await User.create(input);

    // Limpa a senha antes de devolver pro Frontend
    const userJSON = newUser.get({ plain: true });
    delete userJSON.senha;

    return res.status(201).json({ data: userJSON });

  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado no sistema.' });
    }
    console.error("❌ Erro ao criar usuário:", error.message);
    return res.status(400).json({ error: 'Dados inválidos para cadastro' });
  }
});

// ==========================================
// 3. PUT: Editar Usuário (Importante para o Dashboard)
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const input = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Se houver nova senha, faz o hash novamente
    if (input.senha && input.senha.trim() !== "") {
      input.senha = await bcrypt.hash(input.senha, 14);
    } else {
      delete input.senha; // Não sobrescreve a senha se o campo vier vazio
    }

    await user.update(input);
    return res.status(200).json({ message: 'Usuário atualizado com sucesso' });
    
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao atualizar usuário: ' + error.message });
  }
});

// ==========================================
// 4. DELETE: Remover Usuário (Com trava de Root)
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // TRAVA DE SEGURANÇA: Impede que o Administrador Root seja apagado por acidente
    if (id === '1') {
      return res.status(403).json({ error: 'O Administrador Root do sistema não pode ser removido.' });
    }

    const deleted = await User.destroy({ where: { id } });
    if (deleted === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    return res.status(200).json({ message: 'Usuário removido do sistema' });
  } catch (error) {
    console.error("❌ Erro ao deletar usuário:", error.message);
    return res.status(500).json({ error: 'Erro interno ao tentar deletar o usuário' });
  }
});

module.exports = router;