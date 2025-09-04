const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Todas as rotas do dashboard requerem autenticação
router.use(authMiddleware);

// GET /api/dashboard/stats
router.get('/stats', dashboardController.getStats);

// GET /api/dashboard/recent-activities
router.get('/recent-activities', dashboardController.getRecentActivities);

// GET /api/dashboard/department-distribution
router.get('/department-distribution', dashboardController.getDepartmentDistribution);

module.exports = router;