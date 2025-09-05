const express = require('express');
const associationController = require('./association.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// --- PERMISSÕES AJUSTADAS POR ROTA ---

// Apenas o ADMIN pode gerenciar (vincular/desvincular) associações.
router.post('/users/:userId/companies', authMiddleware, authorizeMiddleware(['ADMIN']), associationController.linkUserToCompanies);
router.delete('/users/:userId/companies/:companyId', authMiddleware, authorizeMiddleware(['ADMIN']), associationController.unlinkUserFromCompany);

// ADMIN, GESTAO e SOLICITANTE podem consultar associações.
// A lógica de "ver apenas o seu" será tratada no controller.
router.get('/users/:userId/companies', authMiddleware, authorizeMiddleware(['ADMIN', 'GESTAO', 'SOLICITANTE']), associationController.getCompaniesByUser);
router.get('/companies/:companyId/users', authMiddleware, authorizeMiddleware(['ADMIN']), associationController.getUsersByCompany);

module.exports = router;