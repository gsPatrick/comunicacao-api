const express = require('express');
const settingsController = require('./settings.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

const router = express.Router();

// Protege todas as rotas de configurações
router.use(authMiddleware);

// Rota para buscar a configuração (leitura)
router.get('/resend', checkPermission('email-settings:read'), settingsController.getResendSettings);

// Rota para salvar/atualizar a configuração (escrita)
router.put('/resend', checkPermission('email-settings:write'), settingsController.saveResendSettings);

module.exports = router;