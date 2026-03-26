const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Gestão de Administradores
router.get('/', userController.getAll);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);

module.exports = router;