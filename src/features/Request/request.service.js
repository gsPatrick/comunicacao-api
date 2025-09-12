const {
  Request,
  RequestStatusLog,
  User,
  Company,
  Contract,
  WorkLocation,
  Position,
  Employee,
  UserCompany, // Mantido para validações específicas que podem permanecer
  Workflow,
  Step,
  WorkflowStep,
  Permission,
  UserPermission, // <-- NOVO MODELO IMPORTADO
  sequelize
} = require('../../models');
const { Op } = require('sequelize');
const notificationService = require('../Notifications/notification.service');

/**
 * Gera um número de protocolo único para o dia.
 */
const generateProtocol = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const prefix = `${year}${month}${day}`;
  
  const startOfDay = new Date(year, today.getMonth(), day, 0, 0, 0);
  const endOfDay = new Date(year, today.getMonth(), day, 23, 59, 59);

  const count = await Request.count({ where: { createdAt: { [Op.between]: [startOfDay, endOfDay] } } });

  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${sequence}`;
};

/**
 * Cria uma nova solicitação com base em um workflow.
 */
const createRequest = async (workflowName, requestData, solicitantId) => {
  const { companyId, contractId, workLocationId, positionId, employeeId, candidateName, candidateCpf, candidatePhone, reason } = requestData;

  const workflow = await Workflow.findOne({ where: { name: workflowName, isActive: true } });
  if (!workflow) {
    throw new Error(`Invalid Data: Workflow "${workflowName}" not found or inactive.`);
  }

  // --- NOVA LÓGICA DE PERMISSÃO E ESCOPO ---
  // O middleware já verificou se o usuário tem a permissão 'requests:create'.
  // Agora, verificamos se ele tem permissão para criar nesta EMPRESA específica.
  const solicitant = await User.findByPk(solicitantId);
  if (solicitant.profile !== 'ADMIN') {
      const createPermission = await UserPermission.findOne({
          where: {
              userId: solicitantId,
              permissionKey: 'requests:create',
              // A permissão pode ser global (scopeId is null) ou específica para a empresa
              [Op.or]: [
                  { scopeId: null },
                  { scopeId: companyId }
              ]
          }
      });
      if (!createPermission) {
          throw new Error('Permission Denied: User cannot create requests for this company.');
      }
  }
  // --- FIM DA NOVA LÓGICA ---

  const [company, contract] = await Promise.all([
    Company.findByPk(companyId),
    Contract.findOne({ where: { id: contractId, companyId } })
  ]);
  if (!company || !contract) throw new Error('Invalid Data: Company or Contract not found or mismatched.');

  let workLocation, position, employee;
  if (workLocationId) {
    workLocation = await WorkLocation.findOne({ where: { id: workLocationId, contractId } });
    if (!workLocation) throw new Error('Invalid Data: Work Location not found or mismatched.');
  }
  if (positionId) {
    position = await Position.findByPk(positionId);
    if (!position) throw new Error('Invalid Data: Position not found.');
  }
  if (employeeId) {
    employee = await Employee.findByPk(employeeId, {
      where: { contractId }
    });
    if (!employee) throw new Error('Invalid Data: Employee not found or does not belong to the specified contract.');
  }

  const initialWorkflowStep = await WorkflowStep.findOne({
    where: { workflowId: workflow.id, order: 1 },
    include: [{ model: Step, as: 'step' }]
  });

  if (!initialWorkflowStep || !initialWorkflowStep.step) {
    throw new Error('Workflow not properly configured: No initial step found.');
  }

  const initialStatus = initialWorkflowStep.step.name;

  const transaction = await sequelize.transaction();
  try {
    const protocol = await generateProtocol();

    const newRequest = await Request.create({
      protocol,
      workflowId: workflow.id,
      status: initialStatus,
      companyId, contractId, workLocationId, positionId, employeeId,
      candidateName, candidateCpf, candidatePhone, reason, solicitantId
    }, { transaction });

    await RequestStatusLog.create({
      requestId: newRequest.id,
      status: initialStatus,
      responsibleId: solicitantId,
      notes: `Solicitação de ${workflow.name.toLowerCase()} criada.`
    }, { transaction });

    await transaction.commit();
    await sendNotificationForNextStep(newRequest, initialWorkflowStep.step, solicitantId, null);
    
    return newRequest;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Busca todas as solicitações com base nas permissões do usuário e filtros.
 */
const findAllRequests = async (filters, userInfo) => {
    const { status, workflowName, companyId, protocol, contractId, startDate, endDate, page = 1, limit = 10 } = filters;
    const { id: userId, profile } = userInfo;
    const where = {};
    const companyWhere = {};
  
    // --- NOVA LÓGICA DE PERMISSÃO E ESCOPO ---
    if (profile !== 'ADMIN') {
        const userReadPermissions = await UserPermission.findAll({
            where: {
                userId,
                permissionKey: { [Op.in]: ['requests:read:all', 'requests:read:company', 'requests:read:own'] }
            }
        });

        const hasReadAll = userReadPermissions.some(p => p.permissionKey === 'requests:read:all');

        if (!hasReadAll) {
            const allowedCompanyIds = userReadPermissions
                .filter(p => p.permissionKey === 'requests:read:company' && p.scopeType === 'COMPANY')
                .map(p => p.scopeId);
            
            const canReadOwn = userReadPermissions.some(p => p.permissionKey === 'requests:read:own');

            const conditions = [];
            if (allowedCompanyIds.length > 0) {
                conditions.push({ companyId: { [Op.in]: allowedCompanyIds } });
            }
            if (canReadOwn) {
                conditions.push({ solicitantId: userId });
            }

            if (conditions.length > 0) {
                where[Op.or] = conditions;
            } else {
                // Se não tem nenhuma permissão de leitura, não deve ver nada.
                return { total: 0, requests: [], page, limit };
            }
        }
    }
    // --- FIM DA NOVA LÓGICA ---
  
    // Filtros gerais da requisição
    if (status) where.status = status;
    if (protocol) where.protocol = { [Op.iLike]: `%${protocol}%` };
    if (contractId) where.contractId = contractId;
    if (companyId) where.companyId = companyId; // Sobrescreve filtro de permissão se um filtro específico for aplicado
  
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
  
    let workflowWhere = {};
    if (workflowName) {
      workflowWhere.name = { [Op.iLike]: `%${workflowName}%` };
    }
  
    const offset = (page - 1) * limit;
  
    const { count, rows } = await Request.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Company, as: 'company', attributes: ['id', 'tradeName'], where: companyWhere, required: !!Object.keys(companyWhere).length },
        { model: Contract, as: 'contract', attributes: ['id', 'name'], required: !!contractId },
        { model: User, as: 'solicitant', attributes: ['id', 'name'] },
        { model: Position, as: 'position', attributes: ['id', 'name'] },
        { model: Employee, as: 'employee', attributes: ['id', 'name'] },
        { model: Workflow, as: 'workflow', attributes: ['id', 'name'], where: workflowWhere, required: !!workflowName },
      ]
    });
    return { total: count, requests: rows, page, limit };
};

/**
 * Busca uma solicitação detalhada pelo ID, validando permissão de acesso.
 */
const findRequestById = async (requestId, userInfo) => {
    const { id: userId, profile } = userInfo;

    const request = await Request.findByPk(requestId, {
      include: [
        { model: Company, as: 'company' }, { model: Contract, as: 'contract' },
        { model: WorkLocation, as: 'workLocation' }, { model: Position, as: 'position' },
        { model: Employee, as: 'employee' },
        { model: User, as: 'solicitant', attributes: { exclude: ['password'] } },
        { model: RequestStatusLog, as: 'statusHistory', include: [{ model: User, as: 'responsible', attributes: ['id', 'name', 'profile'] }], order: [['createdAt', 'ASC']] },
        { model: Workflow, as: 'workflow', attributes: ['id', 'name'] },
      ]
    });
  
    if (!request) return null;
  
    // --- NOVA LÓGICA DE PERMISSÃO E ESCOPO ---
    if (profile !== 'ADMIN') {
        const userReadPermissions = await UserPermission.findAll({
            where: {
                userId,
                permissionKey: { [Op.in]: ['requests:read:all', 'requests:read:company', 'requests:read:own'] }
            }
        });

        const hasReadAll = userReadPermissions.some(p => p.permissionKey === 'requests:read:all');
        const hasReadOwn = userReadPermissions.some(p => p.permissionKey === 'requests:read:own');
        const allowedCompanyIds = userReadPermissions
            .filter(p => p.permissionKey === 'requests:read:company')
            .map(p => p.scopeId);

        let canView = false;
        if (hasReadAll) {
            canView = true;
        } else if (allowedCompanyIds.includes(request.companyId)) {
            canView = true;
        } else if (hasReadOwn && request.solicitantId === userId) {
            canView = true;
        }

        if (!canView) {
            throw new Error('Access Denied');
        }
    }
    // --- FIM DA NOVA LÓGICA ---

    return request;
};

/**
 * Atualiza o status de uma solicitação, validando transições e permissões dinamicamente.
 */
const updateRequestStatus = async (requestId, newStepName, responsibleId, notes = null) => {
    const request = await Request.findByPk(requestId, { include: [{ model: Workflow, as: 'workflow' }] });
    if (!request) throw new Error('Request not found.');
    
    const responsibleUser = await User.findByPk(responsibleId);
    if (!responsibleUser) throw new Error('Responsible user not found.');

    // --- NOVA LÓGICA DE PERMISSÃO DE ESCOPO PARA ATUALIZAÇÃO ---
    if (responsibleUser.profile !== 'ADMIN') {
        // O middleware já confirmou que o usuário tem 'requests:update'.
        // Agora, se essa permissão for escopada, garantimos que ele está agindo na empresa correta.
        const updatePermission = await UserPermission.findAll({
            where: {
                userId: responsibleId,
                permissionKey: 'requests:update',
            }
        });

        // Se o usuário tem alguma permissão de update com escopo, ele SÓ pode atuar nesse escopo.
        const scopedPermissions = updatePermission.filter(p => p.scopeType === 'COMPANY');
        if (scopedPermissions.length > 0) {
            const allowedCompanyIds = scopedPermissions.map(p => p.scopeId);
            if (!allowedCompanyIds.includes(request.companyId)) {
                throw new Error(`Permission Denied: You can only update requests for your assigned companies.`);
            }
        }
    }
    // --- FIM DA NOVA LÓGICA ---
  
    const currentStep = await Step.findOne({ where: { name: request.status } });
    const newStep = await Step.findOne({ where: { name: newStepName } });
    if (!currentStep || !newStep) throw new Error(`Invalid step transition.`);
  
    const currentWorkflowStepConfig = await WorkflowStep.findOne({ where: { workflowId: request.workflowId, stepId: currentStep.id } });
    if (!currentWorkflowStepConfig) throw new Error(`Workflow configuration for current step "${request.status}" not found.`);
  
    const allowedNextSteps = currentWorkflowStepConfig.allowedNextStepIds;
    if (allowedNextSteps && Array.isArray(allowedNextSteps) && allowedNextSteps.length > 0 && !allowedNextSteps.includes(newStep.id)) {
      throw new Error(`Invalid status transition from "${request.status}" to "${newStepName}".`);
    }
  
    const transaction = await sequelize.transaction();
    try {
      request.status = newStepName;
      await request.save({ transaction });
  
      await RequestStatusLog.create({
        requestId: request.id,
        status: newStepName,
        responsibleId: responsibleId,
        notes: notes || `Status alterado para "${newStepName}".`
      }, { transaction });
  
      await transaction.commit();
  
      await sendNotificationForNextStep(request, newStep, responsibleId, notes);
      return await findRequestById(request.id, { id: responsibleId, profile: responsibleUser.profile });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
};

/**
 * Solicita o cancelamento de uma requisição.
 */
const requestCancellation = async (requestId, solicitantId, reason) => {
    const request = await Request.findByPk(requestId);
    if (!request) throw new Error('Request not found.');

    // --- LÓGICA DE PERMISSÃO REFORÇADA ---
    // Apenas o criador da solicitação pode pedir o cancelamento.
    if (request.solicitantId !== solicitantId) {
        throw new Error('Permission Denied: You can only request cancellation for your own requests.');
    }
    
    const finalStatuses = ['CANCELADO', 'ADMITIDO', 'DESLIGAMENTO_CONCLUIDO', 'REPROVADO_PELA_GESTAO'];
    if (finalStatuses.includes(request.status)) {
        throw new Error(`Cannot cancel a request with final status "${request.status}".`);
    }

    const newCancellationStep = await Step.findOne({ where: { name: 'CANCELAMENTO_SOLICITADO' } });
    if (!newCancellationStep) throw new Error('Cancellation workflow step "CANCELAMENTO_SOLICITADO" not found.');

    return await updateRequestStatus(request.id, newCancellationStep.name, solicitantId, `Solicitante pediu o cancelamento. Motivo: ${reason || 'Não informado.'}`);
};

/**
 * Resolve um pedido de cancelamento (Ação da Gestão/RH/Admin).
 */
const resolveCancellation = async (requestId, managerId, approved, notes) => {
    const request = await Request.findByPk(requestId, { include: ['solicitant'] });
    if (!request) throw new Error('Request not found.');

    if (request.status !== 'CANCELAMENTO_SOLICITADO') {
        throw new Error(`Cannot resolve cancellation for a request with status "${request.status}".`);
    }

    // A validação de permissão e escopo para 'update' já ocorre em 'updateRequestStatus',
    // que é chamado logo abaixo, então a verificação explícita aqui é redundante.

    let newStatusName;
    if (approved) {
        newStatusName = 'CANCELADO';
    } else {
        const previousStatusLog = await RequestStatusLog.findOne({
            where: { requestId, status: { [Op.ne]: 'CANCELAMENTO_SOLICITADO' } },
            order: [['createdAt', 'DESC']],
        });
        if (!previousStatusLog) throw new Error('Could not determine the previous status.');
        newStatusName = previousStatusLog.status;
    }

    const logNotes = approved
        ? `Cancelamento aprovado. ${notes || ''}`
        : `Cancelamento negado. Retornando ao status anterior. ${notes || ''}`;

    return await updateRequestStatus(request.id, newStatusName, managerId, logNotes);
};

// As funções `exportAllRequests` e `sendNotificationForNextStep` não precisam de alterações de permissão
// pois `exportAllRequests` usa a mesma lógica de `findAllRequests` e `sendNotificationForNextStep` é uma função auxiliar interna.
// Por completeza, incluirei `exportAllRequests` refatorada.

/**
 * Busca TODAS as solicitações para exportação com base nas permissões e filtros.
 */
const exportAllRequests = async (filters, userInfo) => {
    const { status, workflowName, companyId, protocol, contractId, startDate, endDate } = filters;
    const { id: userId, profile } = userInfo;
    const where = {};
    const companyWhere = {};
  
    // --- LÓGICA DE PERMISSÃO E ESCOPO (IDÊNTICA A findAllRequests) ---
    if (profile !== 'ADMIN') {
        const userReadPermissions = await UserPermission.findAll({
            where: {
                userId,
                permissionKey: { [Op.in]: ['requests:read:all', 'requests:read:company', 'requests:read:own'] }
            }
        });

        const hasReadAll = userReadPermissions.some(p => p.permissionKey === 'requests:read:all');

        if (!hasReadAll) {
            const allowedCompanyIds = userReadPermissions
                .filter(p => p.permissionKey === 'requests:read:company' && p.scopeType === 'COMPANY')
                .map(p => p.scopeId);
            
            const canReadOwn = userReadPermissions.some(p => p.permissionKey === 'requests:read:own');

            const conditions = [];
            if (allowedCompanyIds.length > 0) {
                conditions.push({ companyId: { [Op.in]: allowedCompanyIds } });
            }
            if (canReadOwn) {
                conditions.push({ solicitantId: userId });
            }

            if (conditions.length > 0) {
                where[Op.or] = conditions;
            } else {
                return []; // Retorna array vazio
            }
        }
    }
    // --- FIM DA NOVA LÓGICA ---
  
    if (status) where.status = status;
    if (protocol) where.protocol = { [Op.iLike]: `%${protocol}%` };
    if (contractId) where.contractId = contractId;
    if (companyId) where.companyId = companyId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
  
    let workflowWhere = {};
    if (workflowName) {
        workflowWhere.name = { [Op.iLike]: `%${workflowName}%` };
    }

    return await Request.findAll({
        where,
        order: [['createdAt', 'DESC']],
        include: [
            { model: Company, as: 'company', attributes: ['tradeName'], where: companyWhere, required: !!Object.keys(companyWhere).length },
            { model: Contract, as: 'contract', attributes: ['name'], required: !!contractId },
            { model: User, as: 'solicitant', attributes: ['name'] },
            { model: Position, as: 'position', attributes: ['name'] },
            { model: Employee, as: 'employee', attributes: ['name'] },
            { model: Workflow, as: 'workflow', attributes: ['name'], where: workflowWhere, required: !!workflowName },
        ]
    });
};


// Função auxiliar para notificações (sem alterações de permissão)
const sendNotificationForNextStep = async (request, currentStep, responsibleUserId, customMessage = null) => {
  const fullRequest = await Request.findByPk(request.id, {
      include: [
          { model: User, as: 'solicitant', attributes: ['id', 'email', 'name'] },
          { model: Company, as: 'company', attributes: ['tradeName'] },
          { model: Workflow, as: 'workflow', attributes: ['name'] },
          { model: Employee, as: 'employee', attributes: ['name'] },
          { model: Position, as: 'position', attributes: ['name'] },
      ]
  });

  const workflowSteps = await WorkflowStep.findAll({
      where: { workflowId: request.workflowId },
      order: [['order', 'ASC']],
      include: [{ model: Step, as: 'step' }]
  });

  const currentWorkflowStep = workflowSteps.find(ws => ws.step.name === currentStep.name);

  let nextRecipientProfile = null;
  let notificationTitle = `Solicitação ${fullRequest.protocol} - Status: ${currentStep.name}`;
  let notificationMessage = customMessage || `O status da solicitação ${fullRequest.protocol} foi atualizado para "${currentStep.name}".`;
  let notificationLink = `/requests/${fullRequest.id}`;

  if (currentWorkflowStep && Array.isArray(currentWorkflowStep.allowedNextStepIds) && currentWorkflowStep.allowedNextStepIds.length > 0) {
      let nextStepInfo = workflowSteps.find(ws => ws.stepId === currentWorkflowStep.allowedNextStepIds[0]);
      if (nextStepInfo) {
          nextRecipientProfile = nextStepInfo.profileOverride || nextStepInfo.step.defaultProfile;
          notificationTitle = `Ação Necessária: Solicitação ${fullRequest.protocol}`;
          notificationMessage = `A solicitação ${fullRequest.protocol} aguarda sua ação na etapa "${nextStepInfo.step.name}".`;
      }
  } else {
      if (fullRequest.solicitant) {
           await notificationService.sendNotification({ recipientId: fullRequest.solicitant.id, title: `Sua solicitação ${fullRequest.protocol} foi atualizada`, message: `O status foi atualizado para "${currentStep.name}".`, link: notificationLink });
      }
      return;
  }
  
  if (fullRequest.solicitant && fullRequest.solicitant.id !== responsibleUserId) {
       await notificationService.sendNotification({ recipientId: fullRequest.solicitant.id, title: `Sua solicitação ${fullRequest.protocol} foi atualizada`, message: `O status foi atualizado para "${currentStep.name}".`, link: notificationLink });
  }

  if (nextRecipientProfile) {
      const recipients = await User.findAll({
          where: { profile: nextRecipientProfile, isActive: true },
          include: nextRecipientProfile === 'GESTAO' ? [{
              model: Company, as: 'companies', where: { id: fullRequest.companyId }, attributes: []
          }] : []
      });

      for (const recipientUser of recipients) {
          if (recipientUser.id !== responsibleUserId) {
               await notificationService.sendNotification({ recipientId: recipientUser.id, title: notificationTitle, message: notificationMessage, link: notificationLink });
          }
      }
  }
};


module.exports = {
  createRequest,
  findAllRequests,
  findRequestById,
  updateRequestStatus,
  requestCancellation, 
  resolveCancellation,
  exportAllRequests,
  generateProtocol,
};