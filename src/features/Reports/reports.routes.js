const express = require('express');
const router = express.Router();
const reportController = require('./reports.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

// Todas as rotas de relatórios requerem a mesma permissão de visualização
router.use(authMiddleware, checkPermission('reports:view'));

router.get('/stats', reportController.getStats);
router.get('/hiring-overview', reportController.getHiringOverview);

module.exports = router;