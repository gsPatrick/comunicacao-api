const express = require('express');
const userController = require('./user.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// --- ORDEM DAS ROTAS CORRIGIDA ---

// Rota para criar um usuário. Apenas ADMINS podem criar.
router.post('/', authMiddleware, authorizeMiddleware(['ADMIN']), userController.createUser);

// Rota para listar todos os usuários. ADMINS e RH podem listar.
router.get('/', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), userController.getAllUsers);

// Rota de exportação (MAIS ESPECÍFICA, VEM ANTES)
router.get('/export', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), require('../Company/company.controller').exportCompanies); // Reutiliza a função se for idêntica ou cria uma específica

// Rota para o usuário atualizar seu próprio perfil
router.put('/profile/me', authMiddleware, userController.updateMyProfile);

// Rota para buscar um usuário específico por ID (MAIS GENÉRICA, VEM DEPOIS)
router.get('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), userController.getUserById);

// Rota para atualizar um usuário. Apenas ADMINS podem.
router.put('/:id', authMiddleware, authorizeMiddleware(['ADMIN']), userController.updateUser);

// Rota para desativar (soft delete) um usuário. Apenas ADMINS podem.
router.delete('/:id', authMiddleware, authorizeMiddleware(['ADMIN']), userController.deleteUser);

module.exports = router;