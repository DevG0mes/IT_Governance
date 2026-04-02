const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// Listagem e Cadastro
router.get('/', employeeController.getAll);
router.post('/', employeeController.create);

// Atribuição e Status
router.put('/:id/assign', employeeController.assignAsset);
router.put('/:id/toggle-status', employeeController.toggleStatus);
router.put('/:id/offboarding', employeeController.offboarding);
router.put('/:id', employeeController.update);

// Remoção
router.delete('/:id', employeeController.delete);
router.post('/bulk-delete', employeeController.bulkDelete);

module.exports = router;