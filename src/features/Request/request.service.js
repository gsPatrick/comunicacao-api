const {
  Request,
  RequestStatusLog,
  User,
  Company,
  Contract,
  WorkLocation,
  Position,
  Employee,
  UserCompany,
  Workflow,
  Step,
  WorkflowStep,
  sequelize
} = require('../../models');
const { Op } = require('sequelize');
const notificationService = require('../Notifications/notification.service'); // <-- ATUALIZADO para o novo serviço de notificações

/**
 * Gera um número de protocolo único para o dia.
 * @returns {Promise<string>} O número do protocolo.
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
 * @param {string} workflowName - O nome do workflow (ex: "ADMISSAO", "DESLIGAMENTO").
 * @param {object} requestData - Dados da solicitação.
 * @param {string} solicitantId - ID do usuário solicitante.
 * @returns {Promise<Request>} A solicitação criada.
 */
const createRequest = async (workflowName, requestData, solicitantId) => {
  const { companyId, contractId, workLocationId, positionId, employeeId, candidateName, candidateCpf, candidatePhone, reason } = requestData;

  const workflow = await Workflow.findOne({ where: { name: workflowName, isActive: true } });
  if (!workflow) {
    throw new Error(`Invalid Data: Workflow "${workflowName}" not found or inactive.`);
  }

  const userPermission = await UserCompany.findOne({ where: { userId: solicitantId, companyId } });
  if (!userPermission) {
    throw new Error('Permission Denied: User cannot create requests for this company.');
  }

  // Validações básicas de existência para entidades relacionadas
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
      where: { contractId, workLocationId } // Validação de consistência
    });
    if (!employee) throw new Error('Invalid Data: Employee not found or does not belong to the specified contract/location.');
  }


  // Buscar a primeira etapa do workflow
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
      workflowId: workflow.id, // VINCULAR A UM WORKFLOW
      status: initialStatus,
      companyId, contractId, workLocationId, positionId, employeeId,
      candidateName, candidateCpf, candidatePhone, reason, solicitantId
    }, { transaction });

    await RequestStatusLog.create({
      requestId: newRequest.id,
      status: initialStatus,
      responsibleId: solicitantId,
      notes: `Solicitação de ${workflow.name.toLowerCase()} criada pelo cliente.`
    }, { transaction });

    await transaction.commit();

    // Notificação para o perfil responsável pela próxima etapa (se houver) ou Gestores
    await sendNotificationForNextStep(newRequest, initialWorkflowStep.step, solicitantId, null); // Passa o ID do criador como responsável
    
    return newRequest;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Função auxiliar para enviar notificações após a criação/atualização de uma solicitação.
 * @param {Request} request - O objeto da solicitação.
 * @param {Step} currentStep - O objeto da Step que define o status atual.
 * @param {string} responsibleUserId - ID do usuário que realizou a ação.
 * @param {string} customMessage - Mensagem customizada para notificação.
 */
const sendNotificationForNextStep = async (request, currentStep, responsibleUserId, customMessage = null) => {
    // Carregar informações necessárias para a notificação
    const fullRequest = await Request.findByPk(request.id, {
        include: [
            { model: User, as: 'solicitant', attributes: ['id', 'email', 'name'] },
            { model: Company, as: 'company', attributes: ['tradeName'] },
            { model: Workflow, as: 'workflow', attributes: ['name'] },
            { model: Employee, as: 'employee', attributes: ['name'] }, // Para desligamento/substituição
            { model: Position, as: 'position', attributes: ['name'] }, // Para admissão
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
    let notificationLink = `/requests/${fullRequest.id}`; // Exemplo de link para o frontend

    if (currentWorkflowStep && Array.isArray(currentWorkflowStep.allowedNextStepIds) && currentWorkflowStep.allowedNextStepIds.length > 0) {
        let nextStepInfo = null;
        for (const allowedNextStepId of currentWorkflowStep.allowedNextStepIds) {
            nextStepInfo = workflowSteps.find(ws => ws.stepId === allowedNextStepId);
            if (nextStepInfo) break;
        }

        if (nextStepInfo) {
            nextRecipientProfile = nextStepInfo.profileOverride || nextStepInfo.step.defaultProfile;
            notificationTitle = `Ação Necessária: Solicitação ${fullRequest.protocol}`;
            notificationMessage = `A solicitação ${fullRequest.protocol} aguarda a ação do perfil de ${nextRecipientProfile} na etapa "${nextStepInfo.step.name}".`;
        }
    } else {
        // Se não houver próximas etapas definidas (fim do fluxo ou transição aberta), notifica o solicitante
        if (fullRequest.solicitant) {
             await notificationService.sendNotification({
                recipientId: fullRequest.solicitant.id,
                title: `Sua solicitação ${fullRequest.protocol} foi atualizada`,
                message: `O status da sua solicitação ${fullRequest.protocol} foi atualizado para "${currentStep.name}".`,
                link: notificationLink
            });
        }
        return; // Nenhuma outra notificação para perfil específico
    }

    // Notificar o solicitante sobre a atualização do status (mesmo que a próxima ação seja de outro perfil)
    if (fullRequest.solicitant && fullRequest.solicitant.id !== responsibleUserId) { // Não notificar o próprio responsável duas vezes pela mesma ação
         await notificationService.sendNotification({
            recipientId: fullRequest.solicitant.id,
            title: `Sua solicitação ${fullRequest.protocol} foi atualizada`,
            message: `O status da sua solicitação ${fullRequest.protocol} foi atualizado para "${currentStep.name}".`,
            link: notificationLink
        });
    }


    if (nextRecipientProfile) {
        const recipients = await User.findAll({
            where: { profile: nextRecipientProfile, isActive: true },
            // Filtrar por companyId se o perfil for GESTAO ou SOLICITANTE e tiverem vínculo de empresa
            include: nextRecipientProfile === 'GESTAO' || nextRecipientProfile === 'SOLICITANTE' ? [{
                model: Company,
                as: 'companies',
                where: { id: fullRequest.companyId },
                attributes: []
            }] : []
        });

        for (const recipientUser of recipients) {
            if (recipientUser.id !== responsibleUserId) { // Não notificar o próprio responsável pela ação
                 await notificationService.sendNotification({
                    recipientId: recipientUser.id,
                    title: notificationTitle,
                    message: notificationMessage,
                    link: notificationLink
                });
            }
        }
    }
};

/**
 * Busca todas as solicitações com base no perfil do usuário e filtros.
 * @param {object} filters - Opções de filtro (status, workflowName, companyId, protocol, contractId, startDate, endDate, page, limit).
 * @param {object} userInfo - Informações do usuário logado.
 * @returns {Promise<object>} Lista de solicitações e metadados de paginação.
 */
const findAllRequests = async (filters, userInfo) => {
  const { status, workflowName, companyId, protocol, contractId, startDate, endDate, page = 1, limit = 10 } = filters;
  const { id: userId, profile } = userInfo;
  const where = {};
  const companyWhere = {};
  const contractWhere = {};

  // Filtro por solicitante ou empresas associadas para GESTAO
  if (profile === 'SOLICITANTE') {
    where.solicitantId = userId;
  } else if (profile === 'GESTAO') {
    const userCompanies = await UserCompany.findAll({ where: { userId }, attributes: ['companyId'] });
    const allowedCompanyIds = userCompanies.map(uc => uc.companyId);
    companyWhere.id = { [Op.in]: allowedCompanyIds };
  }

  // Filtros gerais da requisição
  if (status) where.status = status;
  if (protocol) where.protocol = { [Op.iLike]: `%${protocol}%` };
  if (contractId) where.contractId = contractId; // Novo filtro por contractId

  // Filtro por CompanyId (cliente)
  if (companyId) {
    if (companyWhere.id && companyWhere.id[Op.in]) {
      // Se já existe filtro de empresa para GESTAO, garante que o companyId solicitado esteja na lista
      if (!companyWhere.id[Op.in].includes(companyId)) {
        companyWhere.id = { [Op.in]: [] }; // Se não estiver, não retorna nada
      } else {
        companyWhere.id = companyId; // Sobrescreve para filtrar o ID específico
      }
    } else {
      companyWhere.id = companyId;
    }
  }

  // Filtro por período de data (createdAt)
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
      {
        model: Company,
        as: 'company',
        attributes: ['id', 'tradeName'],
        where: companyWhere,
        required: !!(Object.keys(companyWhere).length > 0) // Força o JOIN se houver filtro de empresa
      },
      {
        model: Contract,
        as: 'contract',
        attributes: ['id', 'name'],
        where: contractWhere, // Aplica filtro de contrato, se houver
        required: !!contractId // Força o JOIN se houver filtro por contractId
      },
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
 * @param {string} requestId - O ID da solicitação.
 * @param {object} userInfo - Informações do usuário logado.
 * @returns {Promise<Request|null>} A solicitação encontrada.
 */
const findRequestById = async (requestId, userInfo) => {
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

  const { id: userId, profile } = userInfo;
  if (profile === 'SOLICITANTE' && request.solicitantId !== userId) throw new Error('Access Denied');
  if (profile === 'GESTAO') {
    const userPermission = await UserCompany.findOne({ where: { userId, companyId: request.companyId } });
    if (!userPermission) throw new Error('Access Denied');
  }
  return request;
};

/**
 * Atualiza o status de uma solicitação, validando transições e permissões dinamicamente.
 * Esta função substitui analyzeRequestByManager e updateRequestStatusByRh.
 * @param {string} requestId - ID da solicitação.
 * @param {string} newStepName - O nome da nova etapa (status).
 * @param {string} responsibleId - ID do usuário responsável pela atualização.
 * @param {string} notes - Observações sobre a atualização.
 * @returns {Promise<Request>} A solicitação atualizada.
 */
const updateRequestStatus = async (requestId, newStepName, responsibleId, notes = null) => {
  const request = await Request.findByPk(requestId, {
    include: [
      { model: Workflow, as: 'workflow' },
      {
        model: RequestStatusLog,
        as: 'statusHistory',
        order: [['createdAt', 'DESC']],
        limit: 1 // Para pegar o status atual
      }
    ]
  });

  if (!request) throw new Error('Request not found.');
  if (!request.workflow) throw new Error('Request is not associated with a workflow.');

  const currentStatusName = request.status;

  // 1. Encontrar a Step atual e a Step alvo
  const currentStep = await Step.findOne({ where: { name: currentStatusName } });
  const newStep = await Step.findOne({ where: { name: newStepName } });

  if (!currentStep) throw new Error(`Current status step "${currentStatusName}" not found in system configuration.`);
  if (!newStep) throw new Error(`Target step "${newStepName}" not found in system configuration.`);

  // 2. Obter a configuração do WorkflowStep para a etapa atual
  const currentWorkflowStepConfig = await WorkflowStep.findOne({
    where: { workflowId: request.workflowId, stepId: currentStep.id },
    include: [{ model: Step, as: 'step' }]
  });

  if (!currentWorkflowStepConfig) throw new Error(`Workflow configuration for current step "${currentStatusName}" not found.`);

  // 3. Validação de Transição
  // Se allowedNextStepIds for null ou vazio, qualquer transição é permitida.
  const allowedNextSteps = currentWorkflowStepConfig.allowedNextStepIds;
  if (allowedNextSteps && Array.isArray(allowedNextSteps) && allowedNextSteps.length > 0 && !allowedNextSteps.includes(newStep.id)) {
    throw new Error(`Invalid status transition from "${currentStatusName}" to "${newStepName}".`);
  }

  // 4. Validação de Permissão (Autorização)
  const responsibleUser = await User.findByPk(responsibleId);
  if (!responsibleUser) throw new Error('Responsible user not found.');

  const targetStepConfig = await WorkflowStep.findOne({
    where: { workflowId: request.workflowId, stepId: newStep.id },
    include: [{ model: Step, as: 'step' }]
  });
  if (!targetStepConfig) throw new Error(`Workflow configuration for target step "${newStepName}" not found.`);

  const requiredProfile = targetStepConfig.profileOverride || targetStepConfig.step.defaultProfile;

  // ADMIN pode fazer tudo
  if (responsibleUser.profile !== 'ADMIN' && responsibleUser.profile !== requiredProfile) {
    throw new Error(`Permission Denied: User profile "${responsibleUser.profile}" cannot update to step "${newStepName}". Required profile: "${requiredProfile}".`);
  }
  // Se o perfil for GESTAO ou SOLICITANTE, verificar vínculo com a empresa
  if ((responsibleUser.profile === 'GESTAO' || responsibleUser.profile === 'SOLICITANTE') && responsibleUser.profile === requiredProfile) {
      const userCompanyLink = await UserCompany.findOne({ where: { userId: responsibleId, companyId: request.companyId } });
      if (!userCompanyLink) {
          throw new Error(`Permission Denied: User "${responsibleUser.name}" is not linked to company "${request.companyId}".`);
      }
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

    // Enviar notificação para o próximo responsável ou solicitante
    await sendNotificationForNextStep(request, newStep, responsibleId, notes);

    // Recarregar a request para incluir os dados atualizados para a resposta
    return await findRequestById(request.id, { id: responsibleId, profile: responsibleUser.profile });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Solicita o cancelamento de uma requisição (Ação do SOLICITANTE).
 * Adaptado para o novo modelo de workflows.
 * @param {string} requestId - O ID da solicitação a ser cancelada.
 * @param {string} solicitantId - O ID do usuário que está solicitando o cancelamento.
 * @param {string} reason - O motivo do cancelamento.
 * @returns {Promise<Request>} A solicitação atualizada.
 * @throws {Error} Se a lógica de negócio falhar.
 */
const requestCancellation = async (requestId, solicitantId, reason) => {
    const request = await Request.findByPk(requestId);

    if (!request) {
        throw new Error('Request not found.');
    }

    if (request.solicitantId !== solicitantId) {
        throw new Error('Permission Denied: You can only cancel your own requests.');
    }
    
    // Supondo que 'CANCELADO' é uma etapa final e que 'CANCELAMENTO_SOLICITADO' é uma etapa intermediária.
    // Precisa existir essas Steps no sistema.
    const finalStatuses = ['CANCELADO', 'ADMITIDO', 'DESLIGAMENTO_CONCLUIDO', 'NAO_COMPARECEU', 'REPROVADO_PELA_GESTAO'];
    if (finalStatuses.includes(request.status)) {
        throw new Error(`Cannot cancel a request with final status "${request.status}".`);
    }

    const newCancellationStep = await Step.findOne({ where: { name: 'CANCELAMENTO_SOLICITADO' } });
    if (!newCancellationStep) {
      throw new Error('Cancellation workflow step "CANCELAMENTO_SOLICITADO" not found. Please configure it.');
    }

    // Usar a função genérica para atualizar o status
    const updatedRequest = await updateRequestStatus(request.id, newCancellationStep.name, solicitantId, `Solicitante pediu o cancelamento. Motivo: ${reason || 'Não informado.'}`);

    // Notificar gestores responsáveis pela empresa sobre o pedido de cancelamento.
    const company = await Company.findByPk(request.companyId);
    const managers = await User.findAll({
        where: { profile: 'GESTAO', isActive: true },
        include: [{ model: Company, as: 'companies', where: { id: request.companyId }, attributes: [] }]
    });
    for (const manager of managers) {
        await notificationService.sendNotification({
            recipientId: manager.id, // <-- ATUALIZADO para ID do usuário
            title: `Pedido de Cancelamento: Solicitação ${request.protocol}`,
            message: `O cliente ${company.tradeName} solicitou o cancelamento da requisição ${request.protocol}. Sua aprovação é necessária.`,
            link: `/requests/${request.id}`
        });
    }

    return updatedRequest;
};

/**
 * Resolve um pedido de cancelamento (Ação da GESTÃO).
 * Adaptado para o novo modelo de workflows.
 * @param {string} requestId - O ID da solicitação.
 * @param {string} managerId - O ID do gestor que está resolvendo.
 * @param {boolean} approved - Se o cancelamento foi aprovado.
 * @param {string} notes - Observações sobre a decisão.
 * @returns {Promise<Request>} A solicitação atualizada.
 * @throws {Error} Se a lógica de negócio falhar.
 */
const resolveCancellation = async (requestId, managerId, approved, notes) => {
    const request = await Request.findByPk(requestId, { include: ['solicitant'] });
    if (!request) {
        throw new Error('Request not found.');
    }

    if (request.status !== 'CANCELAMENTO_SOLICITADO') {
        throw new Error(`Cannot resolve cancellation for a request with status "${request.status}".`);
    }

    const userPermission = await UserCompany.findOne({ where: { userId: managerId, companyId: request.companyId } });
    if (!userPermission) {
        throw new Error('Permission Denied: You cannot manage requests for this company.');
    }

    let newStatusName;
    if (approved) {
        const cancelledStep = await Step.findOne({ where: { name: 'CANCELADO' } });
        if (!cancelledStep) throw new Error('Cancellation workflow step "CANCELADO" not found. Please configure it.');
        newStatusName = cancelledStep.name;
    } else {
        // Se negado, ele volta ao status anterior.
        const previousStatusLog = await RequestStatusLog.findOne({
            where: { requestId, status: { [Op.ne]: 'CANCELAMENTO_SOLICITADO' } }, // Ignora o próprio pedido de cancelamento
            order: [['createdAt', 'DESC']],
        });
        
        if (!previousStatusLog) {
            throw new Error('Could not determine the previous status of the request for cancellation denial.');
        }
        newStatusName = previousStatusLog.status; // Retorna ao status anterior
    }

    const logNotes = approved
        ? `Cancelamento aprovado pela gestão. ${notes || ''}`
        : `Cancelamento negado pela gestão. A solicitação retorna ao status anterior (${newStatusName}). ${notes || ''}`;

    const updatedRequest = await updateRequestStatus(request.id, newStatusName, managerId, logNotes);
    
    // Notificar o solicitante sobre a decisão
    await notificationService.sendNotification({
        recipientId: request.solicitant.id, // <-- ATUALIZADO para ID do usuário
        title: `Seu pedido de cancelamento para ${request.protocol} foi resolvido`,
        message: `A gestão ${approved ? 'APROVOU' : 'NEGOU'} seu pedido de cancelamento. A solicitação agora está com o status: ${newStatusName}.`,
        link: `/requests/${request.id}`
    });

    return updatedRequest;
};


/**
 * Busca TODAS as solicitações que correspondem aos filtros e perfil, sem paginação.
 * @param {object} filters - Opções de filtro (status, workflowName, companyId, protocol, contractId, startDate, endDate).
 * @param {object} userInfo - Informações do usuário.
 * @returns {Promise<Array<Request>>}
 */
const exportAllRequests = async (filters, userInfo) => {
    const { status, workflowName, companyId, protocol, contractId, startDate, endDate } = filters;
    const { id: userId, profile } = userInfo;
    const where = {};
    const companyWhere = {};
    const contractWhere = {};
  
    if (profile === 'SOLICITANTE') {
      where.solicitantId = userId;
    } else if (profile === 'GESTAO') {
      const userCompanies = await UserCompany.findAll({ where: { userId }, attributes: ['companyId'] });
      const allowedCompanyIds = userCompanies.map(uc => uc.companyId);
      companyWhere.id = { [Op.in]: allowedCompanyIds };
    }
  
    if (status) where.status = status;
    if (protocol) where.protocol = { [Op.iLike]: `%${protocol}%` };
    if (contractId) where.contractId = contractId;

    // Filtro por CompanyId (cliente)
    if (companyId) {
        if (companyWhere.id && companyWhere.id[Op.in]) {
            if (!companyWhere.id[Op.in].includes(companyId)) {
                companyWhere.id = { [Op.in]: [] };
            } else {
                companyWhere.id = companyId;
            }
        } else {
            companyWhere.id = companyId;
        }
    }

    // Filtro por período de data (createdAt)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
  
    let workflowWhere = {};
    if (workflowName) {
        workflowWhere.name = { [Op.iLike]: `%${workflowName}%` };
    }

    const requests = await Request.findAll({
        where,
        order: [['createdAt', 'DESC']],
        include: [
            {
              model: Company,
              as: 'company',
              attributes: ['tradeName'],
              where: companyWhere,
              required: !!(Object.keys(companyWhere).length > 0)
            },
            {
              model: Contract,
              as: 'contract',
              attributes: ['name'],
              where: contractWhere,
              required: !!contractId
            },
            { model: User, as: 'solicitant', attributes: ['name'] },
            { model: Position, as: 'position', attributes: ['name'] },
            { model: Employee, as: 'employee', attributes: ['name'] },
            { model: Workflow, as: 'workflow', attributes: ['name'], where: workflowWhere, required: !!workflowName },
        ]
    });
    return requests;
};


module.exports = {
  generateProtocol,
  createRequest,
  findAllRequests,
  findRequestById,
  updateRequestStatus,
  requestCancellation, 
  resolveCancellation,
  exportAllRequests
};