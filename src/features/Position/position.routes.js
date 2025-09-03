const express = require('express');
const positionController = require('./position.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// Protege todas as rotas de cargos, permitindo acesso apenas a ADMIN e RH.
router.use(authMiddleware, authorizeMiddleware(['ADMIN', 'RH']));

// Rotas de CRUD para Cargos
router.post('/', positionController.createPosition);
router.get('/', positionController.getAllPositions);
router.get('/:id', positionController.getPositionById);
router.put('/:id', positionController.updatePosition);
router.delete('/:id', positionController.deletePosition);

// Rotas para gerenciar a associação entre Cargo e Empresa
router.post('/:id/companies', positionController.linkCompanies);
router.delete('/:id/companies/:companyId', positionController.unlinkCompany);

module.exports = router;