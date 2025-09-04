const express = require('express');
const workflowController = require('./workflow.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// Protege todas as rotas de fluxos de trabalho, permitindo acesso apenas a ADMIN e RH.
router.use(authMiddleware, authorizeMiddleware(['ADMIN', 'RH']));

router.get('/', workflowController.getAllWorkflows);
router.get('/:id', workflowController.getWorkflowById);
router.put('/:id/steps', workflowController.updateWorkflowSteps); // Endpoint para configurar as etapas do fluxo

module.exports = router;