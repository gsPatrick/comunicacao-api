const express = require('express');
const userController = require('./user.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

const router = express.Router();

// Rota para o usuário logado atualizar seu próprio perfil (apenas autenticação)
router.put('/profile/me', authMiddleware, userController.updateMyProfile);

// Rotas de leitura de usuários
router.get('/', authMiddleware, checkPermission('users:read'), userController.getAllUsers);
router.get('/export', authMiddleware, checkPermission('users:read'), userController.exportUsers); // Corrigido para chamar o controller correto
router.get('/:id', authMiddleware, checkPermission('users:read'), userController.getUserById);

// Rotas de escrita de usuários
router.post('/', authMiddleware, checkPermission('users:write'), userController.createUser);
router.put('/:id', authMiddleware, checkPermission('users:write'), userController.updateUser);
router.delete('/:id', authMiddleware, checkPermission('users:write'), userController.deleteUser);

module.exports = router;