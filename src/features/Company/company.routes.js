const express = require('express');
const companyController = require('./company.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// Aplica os middlewares de autenticação e autorização para todas as rotas de empresa.
// Apenas usuários com perfil ADMIN ou RH podem gerenciar empresas.
router.use(authMiddleware, authorizeMiddleware(['ADMIN', 'RH']));

// Rotas de CRUD para Empresas
router.post('/', companyController.createCompany);
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompanyById);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

module.exports = router;