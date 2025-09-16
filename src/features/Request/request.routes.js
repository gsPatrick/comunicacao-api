const express = require('express');
const requestController = require('./request.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');
const checkAnyPermission = require('../../middlewares/checkAnyPermission.middleware'); // <-- NOVO MIDDLEWARE

const router = express.Router();

router.use(authMiddleware);

// ROTAS DE CRIAÇÃO
router.post('/admission', checkPermission('requests:create'), requestController.createAdmissionRequest);
router.post('/resignation', checkPermission('requests:create'), requestController.createResignationRequest);

// ROTAS DE VISUALIZAÇÃO (qualquer permissão de leitura dá acesso)
const readPermissions = ['requests:read:own', 'requests:read:company', 'requests:read:all'];
router.get('/', checkAnyPermission(readPermissions), requestController.getAllRequests);
router.get('/export', checkPermission('requests:export'), requestController.exportRequests); // Export é uma permissão própria
router.get('/:id', checkAnyPermission(readPermissions), requestController.getRequestById);

// ROTAS DE AÇÕES DE ATUALIZAÇÃO DE STATUS
router.patch('/:id/status', checkPermission('requests:update'), requestController.updateRequestStatus);

router.post('/workplace-change', checkPermission('requests:create'), requestController.createWorkplaceChangeRequest);

// ROTAS DO FLUXO DE CANCELAMENTO (são consideradas uma forma de 'update')
router.post('/:id/request-cancellation', checkPermission('requests:update'), requestController.requestCancellation);
router.post('/:id/resolve-cancellation', checkPermission('requests:update'), requestController.resolveCancellation);

module.exports = router;