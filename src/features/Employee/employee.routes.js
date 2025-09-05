const express = require('express');
const employeeController = require('./employee.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');
const companyController = require('../Company/company.controller');

const router = express.Router();
router.get('/export', authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']), employeeController.exportEmployees);

// --- PERMISSÕES AJUSTADAS PARA PERMITIR LEITURA PELO SOLICITANTE ---
// A lógica de segurança para filtrar os dados estará no service.
router.get(
    '/',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE']), // Adicionado SOLICITANTE e GESTAO
    employeeController.getAllEmployees
);

// Rota para importação em lote
router.post('/import', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), employeeController.bulkImport);

// Rotas de CRUD para Colaboradores (exceto GET que foi movido para cima)
router.post('/', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), employeeController.createEmployee);
router.get('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), employeeController.getEmployeeById);
router.put('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), employeeController.updateEmployee);
router.delete('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), employeeController.deleteEmployee);

module.exports = router;