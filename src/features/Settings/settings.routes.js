const express = require('express');
const settingsController = require('./settings.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// Protege todas as rotas de configurações, permitindo acesso apenas a ADMIN.
router.use(authMiddleware, authorizeMiddleware(['ADMIN']));

// Rota para buscar a configuração atual do Resend
router.get('/resend', settingsController.getResendSettings);

// Rota para salvar/atualizar a configuração do Resend
router.put('/resend', settingsController.saveResendSettings);

module.exports = router;