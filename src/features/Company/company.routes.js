const express = require('express');
const companyController = require('./company.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

const router = express.Router();

// Rota para CRIAR: Requer permissão de escrita
router.post('/', authMiddleware, checkPermission('companies:write'), companyController.createCompany);

// Rota para LISTAR: Requer permissão de leitura
router.get('/', authMiddleware, checkPermission('companies:read'), companyController.getAllCompanies);

// Rota de EXPORTAÇÃO: Requer permissão de leitura
router.get('/export', authMiddleware, checkPermission('companies:read'), companyController.exportCompanies);

// Rota para DETALHES: Requer permissão de leitura
router.get('/:id', authMiddleware, checkPermission('companies:read'), companyController.getCompanyById);

// Rota para ATUALIZAR: Requer permissão de escrita
router.put('/:id', authMiddleware, checkPermission('companies:write'), companyController.updateCompany);

// Rota para DELETAR: Requer permissão de escrita
router.delete('/:id', authMiddleware, checkPermission('companies:write'), companyController.deleteCompany);

module.exports = router;