const express = require('express');
const associationController = require('./association.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

const router = express.Router();

// --- PERMISSÕES AJUSTADAS POR ROTA ---

// Rota para o Admin buscar todas as permissões disponíveis para a UI
router.get('/permissions', authMiddleware, checkPermission('associations:manage'), associationController.getAllPermissions);

// Rotas para o Admin gerenciar as permissões de um usuário específico
router.get('/users/:userId/permissions', authMiddleware, checkPermission('associations:manage'), associationController.getUserPermissions);
router.put('/users/:userId/permissions', authMiddleware, checkPermission('associations:manage'), associationController.updateUserPermissions);

// Apenas quem pode gerenciar associações pode vincular/desvincular usuários a empresas.
router.post('/users/:userId/companies', authMiddleware, checkPermission('associations:manage'), associationController.linkUserToCompanies);
router.delete('/users/:userId/companies/:companyId', authMiddleware, checkPermission('associations:manage'), associationController.unlinkUserFromCompany);

// Consultas de associações
router.get('/users/:userId/companies', authMiddleware, checkPermission('associations:manage'), associationController.getCompaniesByUser);
router.get('/companies/:companyId/users', authMiddleware, checkPermission('associations:manage'), associationController.getUsersByCompany);

module.exports = router;