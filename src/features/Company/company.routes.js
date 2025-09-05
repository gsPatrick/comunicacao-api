const express = require('express');
const companyController = require('./company.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// --- PERMISSÕES AJUSTADAS POR ROTA ---

// Rota para CRIAR: ADMIN, RH e GESTAO podem criar.
router.post(
    '/',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']),
    companyController.createCompany
);

// Rota para LISTAR: ADMIN, RH e GESTAO podem listar (o service já filtra os dados para a GESTAO).
router.get(
    '/',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']),
    companyController.getAllCompanies
);

// Rota de EXPORTAÇÃO: ADMIN, RH e GESTAO podem exportar.
router.get(
    '/export',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']),
    companyController.exportCompanies
);

// Rota para DETALHES: ADMIN, RH e GESTAO podem ver detalhes.
router.get(
    '/:id',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']),
    companyController.getCompanyById
);

// Rota para ATUALIZAR: Apenas ADMIN e RH podem editar.
router.put(
    '/:id',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH']),
    companyController.updateCompany
);

// Rota para DELETAR: Apenas ADMIN e RH podem deletar.
router.delete(
    '/:id',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH']),
    companyController.deleteCompany
);

module.exports = router;