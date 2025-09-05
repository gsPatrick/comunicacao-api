const express = require('express');
const positionController = require('./position.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// --- PERMISSÕES AJUSTADAS POR ROTA ---

// CRIAR: Apenas ADMIN e RH
router.post('/', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), positionController.createPosition);

// LER (LISTAR): Todos os perfis logados podem ler a lista para preencher formulários
router.get('/', authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE']), positionController.getAllPositions);

// LER (DETALHES): Apenas ADMIN e RH
router.get('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), positionController.getPositionById);

// ATUALIZAR: Apenas ADMIN e RH
router.put('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), positionController.updatePosition);

// DELETAR: Apenas ADMIN e RH
router.delete('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), positionController.deletePosition);

// GERENCIAR ASSOCIAÇÕES: Apenas ADMIN e RH
router.post('/:id/companies', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), positionController.linkCompanies);
router.delete('/:id/companies/:companyId', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), positionController.unlinkCompany);

module.exports = router;