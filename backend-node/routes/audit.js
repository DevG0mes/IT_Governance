// Arquivo: routes/audit.js
const express = require('express');
const { AuditLog } = require('../config/db');

const router = express.Router();

// ==========================================
// GET: Busca o histórico de ações no sistema
// ==========================================
router.get('/', async (req, res) => {
  try {
    // Busca os logs ordenados do mais recente para o mais antigo 
    // (limitado aos últimos 200 para não pesar o painel, igual ao Go)
    const logs = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 200
    });

    // Retorna no formato exato que o seu Frontend espera
    res.status(200).json({ data: logs });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

// ==========================================
// POST: Registra uma nova ação feita por um usuário
// ==========================================
router.post('/', async (req, res) => {
  try {
    const input = req.body;

    // O Sequelize cria o registro e já preenche o 'createdAt' 
    // com a data/hora exata do momento (equivalente ao time.Now())
    await AuditLog.create(input);

    res.status(201).json({ message: 'Log registrado com sucesso' });
  } catch (error) {
    // Retorna erro 400 em caso de falha de validação dos dados
    res.status(400).json({ error: 'Erro ao salvar o log no banco' });
  }
});

module.exports = router;