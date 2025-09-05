const express = require('express');
const workLocationController = require('./workLocation.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// --- PERMISSÕES AJUSTADAS POR ROTA ---
// --- NOVA ROTA DE EXPORTAÇÃO ---
router.get('/export', authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']), workLocationController.exportWorkLocations);


// Rota para CRIAR: ADMIN, RH e GESTAO podem criar.
router.post(
    '/',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']),
    workLocationController.createWorkLocation
);

// Rota para LISTAR: ADMIN, RH e GESTAO podem listar.
router.get(
    '/',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']),
    workLocationController.getAllWorkLocations
);

// Rota para DETALHES: ADMIN, RH e GESTAO podem ver detalhes.
router.get(
    '/:id',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']),
    workLocationController.getWorkLocationById
);

// Rota para ATUALIZAR: Apenas ADMIN e RH podem editar.
router.put(
    '/:id',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH']),
    workLocationController.updateWorkLocation
);

// Rota para DELETAR: Apenas ADMIN e RH podem deletar.
router.delete(
    '/:id',
    authMiddleware,
    authorizeMiddleware(['ADMIN', 'RH']),
    workLocationController.deleteWorkLocation
);

module.exports = router;