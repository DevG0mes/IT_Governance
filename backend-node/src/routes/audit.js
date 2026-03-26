const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

// Histórico de Ações
router.get('/', auditController.getAll);

// Registro de Ações
router.post('/', auditController.create);

module.exports = router;