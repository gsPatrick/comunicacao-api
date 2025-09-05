const express = require('express');
const contractController = require('./contract.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

router.post('/', authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']), contractController.createContract);
router.get('/', authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']), contractController.getAllContracts);

// --- NOVA ROTA DE EXPORTAÇÃO ---
router.get('/export', authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']), contractController.exportContracts);

router.get('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH', 'GESTAO']), contractController.getContractById);
router.put('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), contractController.updateContract);
router.delete('/:id', authMiddleware, authorizeMiddleware(['ADMIN', 'RH']), contractController.deleteContract);

module.exports = router;
