const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota de Login (POST)
router.post('/login', authController.login);

// 🚨 ALERTA DE GOVERNANÇA: Rota de Setup de Administrador
// Lembre-se de remover ou comentar esta linha após criar o primeiro admin em produção,
// isso blinda a API contra tentativas de recriação de usuários master.
router.get('/setup-admin', authController.setupAdmin);

module.exports = router;