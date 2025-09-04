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
// A rota de desligamento/substituição agora requer que o cliente envie o nome do workflow ou seja inferido.
// Para simplicidade, vamos manter a rota única e o controller fará a distinção.
router.post(
  '/resignation', // ou `/resignation-substitution` ou até mesmo `/new` com `workflowName` no body
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
// ROTAS DE AÇÕES DE ATUALIZAÇÃO DE STATUS (GENÉRICA)
// Esta rota agora lida com todas as transições de status com base na configuração do workflow e permissões.
// Perfis permitidos inicialmente, mas a lógica de permissão é no service.
// ADMIN e RH podem iniciar a mudança de status, mas o serviço validará se o perfil do usuário logado
// tem permissão para a *próxima* etapa específica.
// GESTAO também pode ser incluído se houver etapas onde eles iniciem uma mudança de status (ex: aprovação).
// SOLICITANTE, em geral, não altera status diretamente (exceto cancelamento).
// =================================================================
router.patch(
  '/:id/status', // Nova rota genérica para atualização de status
  authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']), // Quaisquer perfis que podem iniciar uma mudança de status
  requestController.updateRequestStatus
);

// =================================================================
// ROTAS DO FLUXO DE CANCELAMENTO (adaptadas para o novo serviço)
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

// Rota de exportação (mantida, com adaptação no controller)
router.get(
  '/export',
  authorizeMiddleware(['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE']),
  requestController.exportRequests
);


module.exports = router;