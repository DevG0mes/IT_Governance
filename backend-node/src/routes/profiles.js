const express = require('express');
const router = express.Router();
const profileController = require('../controllers/accessProfileController');

router.get('/', profileController.getAll);
router.post('/', profileController.create);
router.put('/:id', profileController.update);
router.delete('/:id', profileController.delete);

module.exports = router;

