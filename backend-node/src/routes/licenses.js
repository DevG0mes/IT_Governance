const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseController');

// Gestão de Licenças
router.get('/', licenseController.getAll);
router.post('/', licenseController.create);
router.put('/:id', licenseController.update);

// Atribuição e Revogação
router.post('/assign', licenseController.assign);
router.delete('/unassign/:id', licenseController.unassign);

module.exports = router;