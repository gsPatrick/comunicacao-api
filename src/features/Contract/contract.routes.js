const express = require('express');
const contractController = require('./contract.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// Protege todas as rotas de contrato, permitindo acesso apenas a ADMIN e RH.
router.use(authMiddleware, authorizeMiddleware(['ADMIN', 'RH']));

router.post('/', contractController.createContract);
router.get('/', contractController.getAllContracts);
router.get('/:id', contractController.getContractById);
router.put('/:id', contractController.updateContract);
router.delete('/:id', contractController.deleteContract);

module.exports = router;