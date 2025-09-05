const express = require('express');
const workLocationController = require('./workLocation.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// --- PERMISSÕES AJUSTADAS POR ROTA ---

// CRIAR: Apenas ADMIN, RH e GESTAO
router.post('/', authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']), workLocationController.createWorkLocation);

// LER (LISTAR): ADMIN, RH, GESTAO e agora SOLICITAN.TE (para preencher formulários)
router.get('/', authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE']), workLocationController.getAllWorkLocations);

// EXPORTAR: ADMIN, RH e GESTAO
router.get('/export', authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']), workLocationController.exportWorkLocations);

// LER (DETALHES): ADMIN, RH e GESTAO
router.get('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']), workLocationController.getWorkLocationById);

// ATUALIZAR: Apenas ADMIN e RH
router.put('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), workLocationController.updateWorkLocation);

// DELETAR: Apenas ADMIN e RH
router.delete('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), workLocationController.deleteWorkLocation);

module.exports = router;