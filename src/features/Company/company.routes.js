const express = require('express');
const companyController = require('./company.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// Aplica os middlewares para todas as rotas de empresa.
router.use(authMiddleware, authorizeMiddleware(['ADMIN', 'RH']));

// Rotas de CRUD para Empresas
router.post('/', companyController.createCompany);
router.get('/', companyController.getAllCompanies);

// Adicione a nova rota de exportação aqui
router.get('/export', companyController.exportCompanies);

router.get('/:id', companyController.getCompanyById);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

module.exports = router;