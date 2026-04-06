const express = require('express');
const router = express.Router();
const finopsController = require('../controllers/finopsController');

router.get('/finops', finopsController.getSnapshot);

module.exports = router;
