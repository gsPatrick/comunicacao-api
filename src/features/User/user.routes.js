const express = require('express');
const userController = require('./user.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// Todas as rotas de gerenciamento de usuários abaixo são protegidas e restritas.

// Rota para criar um usuário. Apenas ADMINS podem criar novos usuários.
router.post(
  '/',
  authMiddleware,
  authorizeMiddleware(['ADMIN']),
  userController.createUser
);

// Rota para listar todos os usuários. Apenas ADMINS e RH podem listar usuários.
router.get(
  '/',
  authMiddleware,
  authorizeMiddleware(['ADMIN', 'RH']),
  userController.getAllUsers
);

// Rota para buscar um usuário específico por ID. ADMINS e RH podem ver.
router.get(
  '/:id',
  authMiddleware,
  authorizeMiddleware(['ADMIN', 'RH']),
  userController.getUserById
);

// Rota para atualizar um usuário. Apenas ADMINS podem atualizar qualquer usuário.
// Um usuário comum poderá ter uma rota separada como /profile para atualizar seus próprios dados.
router.put(
  '/:id',
  authMiddleware,
  authorizeMiddleware(['ADMIN']),
  userController.updateUser
);

// Rota para desativar (soft delete) um usuário. Apenas ADMINS podem desativar usuários.
router.delete(
  '/:id',
  authMiddleware,
  authorizeMiddleware(['ADMIN']),
  userController.deleteUser
);

module.exports = router;