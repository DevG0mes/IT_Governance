const express = require('express');
const router = express.Router();
const finopsController = require('../controllers/finopsController');

router.get('/finops', finopsController.getSnapshot);
router.get('/finops/snapshots', finopsController.listMonthlySnapshots);
router.post('/finops/snapshots/:ym/generate', finopsController.generateMonthlySnapshot);

module.exports = router;
