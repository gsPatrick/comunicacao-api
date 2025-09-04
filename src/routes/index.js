const express = require('express');
const authRouter = require('../features/Auth/auth.routes');
const userRouter = require('../features/User/user.routes');
const companyRouter = require('../features/Company/company.routes');
const contractRouter = require('../features/Contract/contract.routes');
const workLocationRouter = require('../features/WorkLocation/workLocation.routes');
const positionRouter = require('../features/Position/position.routes');
const employeeRouter = require('../features/Employee/employee.routes');
const requestRouter = require('../features/Request/request.routes');
const associationRouter = require('../features/Association/association.routes');
const dashboardRoutes = require('../features/Dashboard/dashboard.routes');
const stepRouter = require('../features/Steps/steps.routes'); // <-- NOVO
const workflowRouter = require('../features/Workflows/workflow.routes'); // <-- NOVO

const router = express.Router();

// Agrupa todas as rotas da aplicação sob seus respectivos prefixos.
// Isso mantém o código organizado e facilita o versionamento da API no futuro.

// Rotas de Autenticação (públicas)
router.use('/auth', authRouter);

// Rotas de Gestão (protegidas)
router.use('/users', userRouter);
router.use('/companies', companyRouter);
router.use('/contracts', contractRouter);
router.use('/work-locations', workLocationRouter);
router.use('/positions', positionRouter);
router.use('/employees', employeeRouter);
router.use('/associations', associationRouter);
router.use('/dashboard', dashboardRoutes);

// Novas rotas para configuração de fluxos
router.use('/steps', stepRouter); // <-- NOVO
router.use('/workflows', workflowRouter); // <-- NOVO

// Rotas de Processos (protegidas)
router.use('/requests', requestRouter);


module.exports = router;