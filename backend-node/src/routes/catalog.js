const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');

// Rotas do Catálogo
router.get('/', catalogController.getAll);
router.post('/', catalogController.create);
router.put('/:id', catalogController.update);
router.delete('/:id', catalogController.delete);

module.exports = router;