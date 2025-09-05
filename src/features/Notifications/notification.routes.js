const express = require('express');
const notificationController = require('./notification.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const router = express.Router();

// Todas as rotas de notificações requerem autenticação
router.use(authMiddleware);

// GET /api/notifications/me - Retorna as notificações do usuário logado
router.get('/me', notificationController.getMyNotifications);

// PATCH /api/notifications/:id/read - Marca uma notificação específica como lida
router.patch('/:id/read', notificationController.markOneAsRead);

// PATCH /api/notifications/mark-all-read - Marca todas as notificações do usuário como lidas
router.patch('/mark-all-read', notificationController.markAllAsRead);

module.exports = router;