const express = require('express');
const workLocationController = require('./workLocation.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorizeMiddleware = require('../../middlewares/authorize.middleware');

const router = express.Router();

// Protege todas as rotas de locais de trabalho, permitindo acesso apenas a ADMIN e RH.
router.use(authMiddleware, authorizeMiddleware(['ADMIN', 'RH']));

router.post('/', workLocationController.createWorkLocation);
router.get('/', workLocationController.getAllWorkLocations);
router.get('/:id', workLocationController.getWorkLocationById);
router.put('/:id', workLocationController.updateWorkLocation);
router.delete('/:id', workLocationController.deleteWorkLocation);

module.exports = router;