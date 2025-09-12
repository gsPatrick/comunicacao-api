const express = require('express');
const contractController = require('./contract.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/checkPermission.middleware');

const router = express.Router();

// CRIAR: Requer permissão de escrita
router.post('/', authMiddleware, checkPermission('contracts:write'), contractController.createContract);

// LER (LISTAR): Requer permissão de leitura
router.get('/', authMiddleware, checkPermission('contracts:read'), contractController.getAllContracts);

// EXPORTAR: Requer permissão de leitura
router.get('/export', authMiddleware, checkPermission('contracts:read'), contractController.exportContracts);

// LER (DETALHES): Requer permissão de leitura
router.get('/:id', authMiddleware, checkPermission('contracts:read'), contractController.getContractById);

// ATUALIZAR: Requer permissão de escrita
router.put('/:id', authMiddleware, checkPermission('contracts:write'), contractController.updateContract);

// DELETAR: Requer permissão de escrita
router.delete('/:id', authMiddleware, checkPermission('contracts:write'), contractController.deleteContract);

module.exports = router;