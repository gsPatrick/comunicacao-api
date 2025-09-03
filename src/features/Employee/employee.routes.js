const express = require('express');
const employeeController = require('./employee.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');
const companyController = require('../Company/company.controller');

const router = express.Router();
router.get('/export', employeeController.exportEmployees); // Agora chama a função correta no controller correto

// Protege todas as rotas de colaboradores, permitindo acesso apenas a ADMIN e RH.
router.use(authMiddleware, authorizeMiddleware(['ADMIN', 'RH']));

// Rota para importação em lote
router.post('/import', employeeController.bulkImport);

// Rotas de CRUD para Colaboradores
router.post('/', employeeController.createEmployee);
router.get('/', employeeController.getAllEmployees);
router.get('/:id', employeeController.getEmployeeById);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;