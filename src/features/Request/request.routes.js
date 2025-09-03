const express = require('express');
const requestController = require('./request.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// Middleware de autenticação é aplicado a todas as rotas de solicitações
router.use(authMiddleware);

// =================================================================
// ROTAS DE CRIAÇÃO (Ação do Solicitante)
// =================================================================
router.post(
  '/admission',
  authorizeMiddleware(['SOLICITANTE']),
  requestController.createAdmissionRequest
);
router.post(
  '/resignation',
  authorizeMiddleware(['SOLICITANTE']),
  requestController.createResignationRequest
);


// =================================================================
// ROTAS DE VISUALIZAÇÃO (Ação de Todos os Perfis)
// =================================================================
router.get(
  '/',
  authorizeMiddleware(['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE']),
  requestController.getAllRequests
);
router.get(
  '/:id',
  authorizeMiddleware(['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE']),
  requestController.getRequestById
);


// =================================================================
// ROTAS DE AÇÕES POR PERFIL
// =================================================================

// Ação da Gestão: Aprovar ou Reprovar uma solicitação inicial
router.patch(
  '/:id/analyze',
  authorizeMiddleware(['GESTAO']),
  requestController.analyzeRequest
);

// Ação do RH: Atualizar o status de uma solicitação durante o processo
router.patch(
  '/:id/rh-status',
  authorizeMiddleware(['ADMIN', 'RH']),
  requestController.updateStatusByRh
);

// =================================================================
// ROTAS DE AÇÕES POR PERFIL
// =================================================================

// Ação da Gestão: Aprovar ou Reprovar uma solicitação inicial
router.patch(
  '/:id/analyze',
  authorizeMiddleware(['GESTAO']),
  requestController.analyzeRequest
);

// Ação do RH: Atualizar o status de uma solicitação durante o processo
router.patch(
  '/:id/rh-status',
  authorizeMiddleware(['ADMIN', 'RH']),
  requestController.updateStatusByRh
);

// =================================================================
// ROTAS DO FLUXO DE CANCELAMENTO
// =================================================================

// Ação do Solicitante: Pedir o cancelamento de uma solicitação
router.post(
    '/:id/request-cancellation',
    authorizeMiddleware(['SOLICITANTE']),
    requestController.requestCancellation
);

// Ação da Gestão: Aprovar ou negar um pedido de cancelamento
router.post(
    '/:id/resolve-cancellation',
    authorizeMiddleware(['GESTAO']),
    requestController.resolveCancellation
);


// TODO: Implementar rotas para o fluxo de cancelamento/desistência, se necessário.
// Ex: POST /:id/request-cancellation (Solicitante)
// Ex: POST /:id/resolve-cancellation (Gestão)


module.exports = router;