// Arquivo: src/routes/assets.js
const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');

// O "Porteiro" apenas aponta o caminho para o "Cérebro"
router.get('/', assetController.getAll);
router.post('/', assetController.create);
router.put('/:id', assetController.update);
router.put('/:id/unassign', assetController.unassign);
router.put('/:id/maintenance', assetController.maintenance);
router.put('/:id/discard', assetController.discard);
router.post('/bulk', assetController.importBulk);
router.post('/bulk-delete', assetController.bulkDelete);
router.delete('/:id', assetController.delete);

module.exports = router;