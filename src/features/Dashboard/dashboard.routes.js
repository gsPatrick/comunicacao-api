const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

// Todas as rotas do dashboard requerem a mesma permissão de visualização
router.use(authMiddleware, checkPermission('dashboard:view'));

router.get('/stats', dashboardController.getStats);
router.get('/recent-activities', dashboardController.getRecentActivities);
router.get('/department-distribution', dashboardController.getDepartmentDistribution);

module.exports = router;