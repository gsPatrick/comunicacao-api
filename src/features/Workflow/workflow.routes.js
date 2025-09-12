const express = require('express');
const workflowController = require('./workflow.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

const router = express.Router();

router.use(authMiddleware);

// Rotas de leitura de workflows
router.get('/', checkPermission('workflows:read'), workflowController.getAllWorkflows);
router.get('/:id', checkPermission('workflows:read'), workflowController.getWorkflowById);

// Rota de escrita de workflows
router.put('/:id/steps', checkPermission('workflows:write'), workflowController.updateWorkflowSteps);

module.exports = router;