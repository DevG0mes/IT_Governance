const express = require('express');
const multer = require('multer');
const router = express.Router();
const contractController = require('../controllers/contractController');

// Configuração rápida do Multer para esta rota
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});

// CRUD
router.get('/', contractController.getAll);
router.post('/', contractController.create);
router.put('/:id', contractController.update);
router.delete('/:id', contractController.delete);

// OCR / PDF Analyze
// O middleware 'upload.single' deve vir antes do controller
router.post('/analyze-pdf', upload.single('file'), contractController.analyzePdf);

module.exports = router;