const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota de Login (POST)
router.post('/login', authController.login);

// Rota de Setup (Remover ou comentar após o primeiro uso em produção!)
router.get('/setup-admin', authController.setupAdmin);

module.exports = router;