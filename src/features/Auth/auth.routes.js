const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

// Esta rota é pública e não requer autenticação
router.post('/login', authController.login);

module.exports = router;