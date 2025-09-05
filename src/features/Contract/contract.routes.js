const express = require('express');
const contractController = require('./contract.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// --- PERMISSÕES AJUSTADAS POR ROTA ---

// Rota para CRIAR: ADMIN, RH e GESTAO podem criar.
router.post(
    '/',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']),
    contractController.createContract
);

// Rota para LISTAR: ADMIN, RH e GESTAO podem listar.
router.get(
    '/',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']),
    contractController.getAllContracts
);

// Rota para DETALHES: ADMIN, RH e GESTAO podem ver detalhes.
router.get(
    '/:id',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']),
    contractController.getContractById
);

// Rota para ATUALIZAR: Apenas ADMIN e RH podem editar.
router.put(
    '/:id',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH']),
    contractController.updateContract
);

// Rota para DELETAR: Apenas ADMIN e RH podem deletar.
router.delete(
    '/:id',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH']),
    contractController.deleteContract
);


module.exports = router;