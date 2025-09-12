const express = require('express');
const workLocationController = require('./workLocation.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

const router = express.Router();

// LER (LISTAR, DETALHES, EXPORTAR)
router.get('/', authMiddleware, checkPermission('work-locations:read'), workLocationController.getAllWorkLocations);
router.get('/export', authMiddleware, checkPermission('work-locations:read'), workLocationController.exportWorkLocations);
router.get('/:id', authMiddleware, checkPermission('work-locations:read'), workLocationController.getWorkLocationById);

// CRIAR, ATUALIZAR, DELETAR
router.post('/', authMiddleware, checkPermission('work-locations:write'), workLocationController.createWorkLocation);
router.put('/:id', authMiddleware, checkPermission('work-locations:write'), workLocationController.updateWorkLocation);
router.delete('/:id', authMiddleware, checkPermission('work-locations:write'), workLocationController.deleteWorkLocation);

module.exports = router;