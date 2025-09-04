const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware'); // Adicionado authorizeMiddleware

// Todas as rotas do dashboard requerem autenticação e podem ser acessadas por ADMIN, RH e GESTAO
router.use(authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO'])); // GESTAO precisa de acesso para ver seu dashboard

// GET /api/dashboard/stats
router.get('/stats', dashboardController.getStats);

// GET /api/dashboard/recent-activities
router.get('/recent-activities', dashboardController.getRecentActivities);

// GET /api/dashboard/department-distribution
router.get('/department-distribution', dashboardController.getDepartmentDistribution);

module.exports = router;