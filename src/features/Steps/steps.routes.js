const express = require('express');
const stepController = require('./steps.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// Protege todas as rotas de etapas, permitindo acesso apenas a ADMIN e RH.
router.use(authMiddleware, authorizeMiddleware(['ADMIN', 'RH']));

// Rotas de CRUD para Etapas
router.post('/', stepController.createStep);
router.get('/', stepController.getAllSteps);
router.get('/:id', stepController.getStepById);
router.put('/:id', stepController.updateStep);
router.delete('/:id', stepController.deleteStep);

module.exports = router;