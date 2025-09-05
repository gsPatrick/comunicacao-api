const express = require('express');
const requestController = require('./request.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

router.use(authMiddleware);

// --- ORDEM DAS ROTAS CORRIGIDA ---

// ROTAS DE CRIAÇÃO
router.post('/admission', authorizeMiddleware(['SOLICITANTE']), requestController.createAdmissionRequest);
router.post('/resignation', authorizeMiddleware(['SOLICITANTE']), requestController.createResignationRequest);

// ROTAS DE VISUALIZAÇÃO
router.get('/', authorizeMiddleware(['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE']), requestController.getAllRequests);

// ROTA DE EXPORTAÇÃO (MAIS ESPECÍFICA, VEM ANTES)
router.get('/export', authorizeMiddleware(['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE']), requestController.exportRequests);

// ROTA DE DETALHES POR ID (MAIS GENÉRICA, VEM DEPOIS)
router.get('/:id', authorizeMiddleware(['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE']), requestController.getRequestById);

// ROTAS DE AÇÕES DE ATUALIZAÇÃO DE STATUS
router.patch('/:id/status', authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']), requestController.updateRequestStatus);

// ROTAS DO FLUXO DE CANCELAMENTO
router.post('/:id/request-cancellation', authorizeMiddleware(['SOLICITANTE']), requestController.requestCancellation);
router.post('/:id/resolve-cancellation', authorizeMiddleware(['GESTAO']), requestController.resolveCancellation);

module.exports = router;
