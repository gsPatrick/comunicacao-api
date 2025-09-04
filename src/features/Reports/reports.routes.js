const express = require('express');
const router = express.Router();
const reportController = require('./reports.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

// Todas as rotas de relatórios requerem autenticação e são visíveis para ADMIN e RH
router.use(authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO'])); // GESTAO também pode ver seus relatórios

// GET /api/reports/stats
router.get('/stats', reportController.getStats);

// GET /api/reports/hiring-overview
router.get('/hiring-overview', reportController.getHiringOverview);

module.exports = router;