const express = require('express');
const router = express.Router();
const { getPublicResources } = require('../controllers/resourceController');

router.get('/', getPublicResources);

module.exports = router;