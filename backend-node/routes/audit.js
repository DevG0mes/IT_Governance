// Arquivo: routes/audit.js
const express = require('express');
const router = express.Router();
// ✅ Importação correta centralizada no db.js
const { AuditLog } = require('../config/db');

// ==========================================
// GET: Busca o histórico de ações no sistema
// ==========================================
router.get('/', async (req, res) => {
  try {
    // Busca os logs ordenados do mais recente para o mais antigo 
    const logs = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 200 // Mantém a performance igual ao seu código em Go
    });

    // Retorna no formato exato que o seu Frontend (silver-monkey) espera
    return res.status(200).json({ data: logs });
  } catch (error) {
    console.error("❌ Erro ao buscar logs de auditoria:", error.message);
    return res.status(500).json({ error: 'Erro ao buscar logs no banco de dados' });
  }
});

// ==========================================
// POST: Registra uma nova ação feita por um usuário
// ==========================================
router.post('/', async (req, res) => {
  try {
    const input = req.body;

    // O Sequelize cria o registro e preenche o 'createdAt' automaticamente
    const newLog = await AuditLog.create(input);

    return res.status(201).json({ 
      message: 'Log registrado com sucesso',
      data: newLog 
    });
  } catch (error) {
    console.error("❌ Erro ao registrar log:", error.message);
    return res.status(400).json({ error: 'Falha ao salvar o log de auditoria' });
  }
});

module.exports = router;