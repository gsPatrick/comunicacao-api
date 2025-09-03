const express = require('express');
const associationController = require('./association.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// Protege todas as rotas de associação, permitindo acesso apenas a ADMIN.
// Apenas o ADMIN pode gerenciar quem vê o quê.
router.use(authMiddleware, authorizeMiddleware(['ADMIN']));

// =================================================================
// ROTAS DE AÇÃO
// =================================================================

// Vincula um usuário a um conjunto de empresas
router.post('/users/:userId/companies', associationController.linkUserToCompanies);

// Desvincula um usuário de uma empresa específica
router.delete('/users/:userId/companies/:companyId', associationController.unlinkUserFromCompany);


// =================================================================
// ROTAS DE CONSULTA
// =================================================================

// Lista todas as empresas vinculadas a um usuário
router.get('/users/:userId/companies', associationController.getCompaniesByUser);

// Lista todos os usuários vinculados a uma empresa
router.get('/companies/:companyId/users', associationController.getUsersByCompany);

module.exports = router;