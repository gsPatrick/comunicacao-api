const express = require('express');
const employeeController = require('./employee.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

const router = express.Router();

router.get('/export', authMiddleware, checkPermission('employees:read'), employeeController.exportEmployees);
router.get('/', authMiddleware, checkPermission('employees:read'), employeeController.getAllEmployees);
router.get('/:id', authMiddleware, checkPermission('employees:read'), employeeController.getEmployeeById);

router.post('/import', authMiddleware, checkPermission('employees:import'), employeeController.bulkImport);

router.post('/', authMiddleware, checkPermission('employees:write'), employeeController.createEmployee);
router.put('/:id', authMiddleware, checkPermission('employees:write'), employeeController.updateEmployee);
router.delete('/:id', authMiddleware, checkPermission('employees:write'), employeeController.deleteEmployee);

module.exports = router;