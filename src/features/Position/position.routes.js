const express = require('express');
const positionController = require('./position.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

const router = express.Router();

// LER (LISTAR E DETALHES)
router.get('/', authMiddleware, checkPermission('positions:read'), positionController.getAllPositions);
router.get('/:id', authMiddleware, checkPermission('positions:read'), positionController.getPositionById);

// CRIAR, ATUALIZAR, DELETAR E GERENCIAR ASSOCIAÇÕES
router.post('/', authMiddleware, checkPermission('positions:write'), positionController.createPosition);
router.put('/:id', authMiddleware, checkPermission('positions:write'), positionController.updatePosition);
router.delete('/:id', authMiddleware, checkPermission('positions:write'), positionController.deletePosition);
router.post('/:id/companies', authMiddleware, checkPermission('positions:write'), positionController.linkCompanies);
router.delete('/:id/companies/:companyId', authMiddleware, checkPermission('positions:write'), positionController.unlinkCompany);

module.exports = router;