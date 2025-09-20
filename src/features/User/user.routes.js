const express = require('express');
const userController = require('./user.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

const router = express.Router();

// Middleware para verificar se o usuário é ADMIN
const isAdmin = (req, res, next) => {
  if (req.userProfile !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem executar esta ação.' });
  }
  next();
};

// Middleware para verificar se o usuário é ADMIN ou tem a permissão de escrita
const canWriteUsers = (req, res, next) => {
  if (req.userProfile === 'ADMIN') {
    return next(); // Se for ADMIN, permite a passagem
  }
  // Se não for ADMIN, executa a verificação de permissão granular
  return checkPermission('users:write')(req, res, next);
};

// Rota para o usuário logado atualizar seu próprio perfil
router.put('/profile/me', authMiddleware, userController.updateMyProfile);

// Rotas de leitura
router.get('/', authMiddleware, checkPermission('users:read'), userController.getAllUsers);
router.get('/export', authMiddleware, checkPermission('users:read'), userController.exportUsers);
router.get('/:id', authMiddleware, checkPermission('users:read'), userController.getUserById);

// Rotas de escrita (Criar, Editar, Desativar)
router.post('/', authMiddleware, canWriteUsers, userController.createUser);
router.put('/:id', authMiddleware, canWriteUsers, userController.updateUser);
router.delete('/:id', authMiddleware, canWriteUsers, userController.deleteUser); // Rota para DESATIVAR (soft delete)

// Rota de exclusão permanente (apenas para ADMIN)
router.delete('/:id/permanent', authMiddleware, isAdmin, userController.permanentlyDeleteUser);

module.exports = router;