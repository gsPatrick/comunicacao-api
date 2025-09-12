const express = require('express');
const stepController = require('./steps.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

const router = express.Router();

router.use(authMiddleware);

// Rotas de leitura
router.get('/', checkPermission('steps:read'), stepController.getAllSteps);
router.get('/:id', checkPermission('steps:read'), stepController.getStepById);

// Rotas de escrita
router.post('/', checkPermission('steps:write'), stepController.createStep);
router.put('/:id', checkPermission('steps:write'), stepController.updateStep);
router.delete('/:id', checkPermission('steps:write'), stepController.deleteStep);

module.exports = router;