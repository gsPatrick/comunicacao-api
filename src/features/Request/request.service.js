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
  sequelize
} = require('../../models');
const { Op } = require('sequelize');
const notificationService = require('../../services/notification.service');

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
 * Cria uma nova solicitação de ADMISSÃO.
 * @param {object} requestData - Dados da solicitação.
 * @param {string} solicitantId - ID do usuário solicitante.
 * @returns {Promise<Request>} A solicitação criada.
 */
const createAdmissionRequest = async (requestData, solicitantId) => {
  const { companyId, contractId, workLocationId, positionId, candidateName, candidateCpf, candidatePhone, reason } = requestData;

  const userPermission = await UserCompany.findOne({ where: { userId: solicitantId, companyId } });
  if (!userPermission) throw new Error('Permission Denied: User cannot create requests for this company.');

  const [company, contract, workLocation, position] = await Promise.all([
    Company.findByPk(companyId),
    Contract.findOne({ where: { id: contractId, companyId } }),
    WorkLocation.findOne({ where: { id: workLocationId, contractId } }),
    Position.findByPk(positionId)
  ]);

  if (!company || !contract || !workLocation || !position) throw new Error('Invalid Data: Company, Contract, Work Location, or Position not found or mismatched.');
  
  const transaction = await sequelize.transaction();
  try {
    const protocol = await generateProtocol();
    const initialStatus = 'ENVIADO_PARA_GESTAO';

    const newRequest = await Request.create({
      protocol, type: 'ADMISSAO', status: initialStatus,
      companyId, contractId, workLocationId, positionId,
      candidateName, candidateCpf, candidatePhone, reason, solicitantId
    }, { transaction });

    await RequestStatusLog.create({
      requestId: newRequest.id, status: initialStatus, responsibleId: solicitantId,
      notes: 'Solicitação criada pelo cliente.'
    }, { transaction });

    await transaction.commit();
    // Notificações para Gestores
    const managers = await User.findAll({
      where: { profile: 'GESTAO', isActive: true },
      include: [{ model: Company, as: 'companies', where: { id: companyId }, attributes: [] }]
    });
    for (const manager of managers) {
      await notificationService.sendNotification({
        recipient: manager.email, subject: `Nova Solicitação de Admissão: ${protocol}`,
        message: `Uma nova solicitação de admissão para o cargo de ${position.name} foi criada por ${company.tradeName} e aguarda sua análise.`
      });
    }
    return newRequest;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Cria uma nova solicitação de DESLIGAMENTO ou SUBSTITUIÇÃO.
 * @param {object} requestData - Dados da solicitação, incluindo employeeId.
 * @param {string} solicitantId - ID do usuário solicitante.
 * @returns {Promise<Request>} A solicitação criada.
 */
const createResignationRequest = async (requestData, solicitantId) => {
  const { companyId, contractId, workLocationId, employeeId, type, reason } = requestData;
  if (!['DESLIGAMENTO', 'SUBSTITUICAO'].includes(type)) throw new Error('Invalid request type.');

  const userPermission = await UserCompany.findOne({ where: { userId: solicitantId, companyId } });
  if (!userPermission) throw new Error('Permission Denied: User cannot create requests for this company.');

  const employee = await Employee.findByPk(employeeId, {
    where: { contractId, workLocationId } // Validação de consistência
  });
  if (!employee) throw new Error('Invalid Data: Employee not found or does not belong to the specified contract/location.');

  const transaction = await sequelize.transaction();
  try {
    const protocol = await generateProtocol();
    const initialStatus = 'ENVIADO_PARA_GESTAO';
    
    const newRequest = await Request.create({
      protocol, type, status: initialStatus,
      companyId, contractId, workLocationId, employeeId, reason, solicitantId
    }, { transaction });

    await RequestStatusLog.create({
      requestId: newRequest.id, status: initialStatus, responsibleId: solicitantId,
      notes: `Solicitação de ${type.toLowerCase()} criada pelo cliente.`
    }, { transaction });

    await transaction.commit();
    // Notificações para Gestores
    const company = await Company.findByPk(companyId);
    const managers = await User.findAll({
      where: { profile: 'GESTAO', isActive: true },
      include: [{ model: Company, as: 'companies', where: { id: companyId }, attributes: [] }]
    });
    for (const manager of managers) {
        await notificationService.sendNotification({
            recipient: manager.email, subject: `Nova Solicitação de ${type}: ${protocol}`,
            message: `Uma nova solicitação para o colaborador ${employee.name} foi criada por ${company.tradeName} e aguarda sua análise.`
        });
    }
    return newRequest;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Busca todas as solicitações com base no perfil do usuário e filtros.
 * @param {object} filters - Opções de filtro.
 * @param {object} userInfo - Informações do usuário logado.
 * @returns {Promise<object>} Lista de solicitações e metadados de paginação.
 */
const findAllRequests = async (filters, userInfo) => {
  const { status, type, companyId, protocol, page = 1, limit = 10 } = filters;
  const { id: userId, profile } = userInfo;
  const where = {};

  if (profile === 'SOLICITANTE') {
    where.solicitantId = userId;
  } else if (profile === 'GESTAO') {
    const userCompanies = await UserCompany.findAll({ where: { userId }, attributes: ['companyId'] });
    const companyIds = userCompanies.map(uc => uc.companyId);
    where.companyId = { [Op.in]: companyIds };
  }

  if (status) where.status = status;
  if (type) where.type = type;
  if (protocol) where.protocol = { [Op.iLike]: `%${protocol}%` };
  if (companyId) where.companyId = companyId;

  const offset = (page - 1) * limit;
  const { count, rows } = await Request.findAndCountAll({
    where, limit, offset, order: [['createdAt', 'DESC']],
    include: [
      { model: Company, as: 'company', attributes: ['id', 'tradeName'] },
      { model: User, as: 'solicitant', attributes: ['id', 'name'] },
      { model: Position, as: 'position', attributes: ['id', 'name'] },
      { model: Employee, as: 'employee', attributes: ['id', 'name'] },
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
      { model: RequestStatusLog, as: 'statusHistory', include: [{ model: User, as: 'responsible', attributes: ['id', 'name', 'profile'] }], order: [['createdAt', 'ASC']] }
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
 * Analisa uma solicitação (Aprovação/Reprovação pela GESTÃO).
 * @param {string} requestId - ID da solicitação.
 * @param {object} analysisData - Dados da análise ({ approved, notes }).
 * @param {string} managerId - ID do gestor.
 * @returns {Promise<Request>} A solicitação atualizada.
 */
const analyzeRequestByManager = async (requestId, analysisData, managerId) => {
  const { approved, notes } = analysisData;
  const request = await Request.findByPk(requestId, { include: ['solicitant'] });

  if (!request) throw new Error('Request not found.');
  if (request.status !== 'ENVIADO_PARA_GESTAO') throw new Error(`Cannot analyze request with status "${request.status}".`);

  const userPermission = await UserCompany.findOne({ where: { userId: managerId, companyId: request.companyId } });
  if (!userPermission) throw new Error('Permission Denied: Manager cannot analyze requests for this company.');

  const newStatus = approved ? 'APROVADO_PELA_GESTAO' : 'REPROVADO_PELA_GESTAO';
  const logNotes = approved ? `Aprovado pela Gestão. Observações: ${notes || 'Nenhuma.'}` : `Reprovado pela Gestão. Motivo: ${notes || 'Não informado.'}`;
  
  const transaction = await sequelize.transaction();
  try {
    request.status = newStatus;
    await request.save({ transaction });
    await RequestStatusLog.create({ requestId, status: newStatus, responsibleId: managerId, notes: logNotes }, { transaction });
    await transaction.commit();

    await notificationService.sendNotification({
        recipient: request.solicitant.email, subject: `Sua solicitação ${request.protocol} foi atualizada`,
        message: `Sua solicitação foi ${approved ? 'APROVADA' : 'REPROVADA'} pela gestão. Detalhes: ${logNotes}`
    });
    if (approved) {
        const rhUsers = await User.findAll({ where: { profile: 'RH', isActive: true } });
        for (const rhUser of rhUsers) {
            await notificationService.sendNotification({
                recipient: rhUser.email, subject: `Solicitação Aprovada: ${request.protocol}`,
                message: `A solicitação ${request.protocol} foi aprovada e aguarda o início do processo seletivo.`
            });
        }
    }
    return request;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Atualiza o status de uma solicitação (Ações do RH).
 * @param {string} requestId - ID da solicitação.
 * @param {object} statusData - Dados do novo status ({ status, notes }).
 * @param {string} rhUserId - ID do usuário de RH.
 * @returns {Promise<Request>} A solicitação atualizada.
 */
const updateRequestStatusByRh = async (requestId, statusData, rhUserId) => {
    const { status: newStatus, notes } = statusData;
    const request = await Request.findByPk(requestId, { include: ['solicitant'] });
    if (!request) throw new Error('Request not found.');

    // Mapeamento de transições de status válidas para o RH
    const validTransitions = {
        'APROVADO_PELA_GESTAO': ['INICIADO_PROCESSO_SELETIVO', 'ENTREVISTA_REALIZADA', 'PROVA_APLICADA', 'EXAME_MEDICO_SOLICITADO', 'COLETA_DOCUMENTACAO', 'NAO_COMPARECEU', 'ADMITIDO'],
        'INICIADO_PROCESSO_SELETIVO': ['ENTREVISTA_REALIZADA', 'PROVA_APLICADA', 'EXAME_MEDICO_SOLICITADO', 'COLETA_DOCUMENTACAO', 'NAO_COMPARECEU'],
        'ENTREVISTA_REALIZADA': ['PROVA_APLICADA', 'EXAME_MEDICO_SOLICITADO', 'COLETA_DOCUMENTACAO', 'NAO_COMPARECEU'],
        // ... e assim por diante para todas as etapas do fluxo de admissão e desligamento
    };

    if (!validTransitions[request.status] || !validTransitions[request.status].includes(newStatus)) {
        throw new Error(`Invalid status transition from "${request.status}" to "${newStatus}".`);
    }

    const transaction = await sequelize.transaction();
    try {
        request.status = newStatus;
        await request.save({ transaction });
        await RequestStatusLog.create({
            requestId, status: newStatus, responsibleId: rhUserId,
            notes: `Status alterado pelo RH. Observações: ${notes || 'Nenhuma.'}`
        }, { transaction });
        await transaction.commit();

        await notificationService.sendNotification({
            recipient: request.solicitant.email, subject: `Sua solicitação ${request.protocol} foi atualizada`,
            message: `O status da sua solicitação foi atualizado para: ${newStatus}.`
        });
        
        return request;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Solicita o cancelamento de uma requisição (Ação do SOLICITANTE).
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

    // Validação: Garante que o usuário que está cancelando é o mesmo que criou.
    if (request.solicitantId !== solicitantId) {
        throw new Error('Permission Denied: You can only cancel your own requests.');
    }
    
    // Regra de Negócio: Não se pode cancelar solicitações já finalizadas.
    const finalStatuses = ['ADMITIDO', 'REPROVADO_PELA_GESTAO', 'CANCELADO', 'NAO_COMPARECEU', 'DESLIGAMENTO_CONCLUIDO'];
    if (finalStatuses.includes(request.status)) {
        throw new Error(`Cannot cancel a request with final status "${request.status}".`);
    }

    const newStatus = 'CANCELAMENTO_SOLICITADO';
    const transaction = await sequelize.transaction();
    try {
        request.status = newStatus;
        await request.save({ transaction });

        await RequestStatusLog.create({
            requestId,
            status: newStatus,
            responsibleId: solicitantId,
            notes: `Solicitante pediu o cancelamento. Motivo: ${reason || 'Não informado.'}`
        }, { transaction });

        await transaction.commit();
        
        // Notificar os gestores responsáveis
        const company = await Company.findByPk(request.companyId);
        const managers = await User.findAll({
            where: { profile: 'GESTAO', isActive: true },
            include: [{ model: Company, as: 'companies', where: { id: request.companyId }, attributes: [] }]
        });
        for (const manager of managers) {
            await notificationService.sendNotification({
                recipient: manager.email,
                subject: `Pedido de Cancelamento: Solicitação ${request.protocol}`,
                message: `O cliente ${company.tradeName} solicitou o cancelamento da requisição ${request.protocol}. Sua aprovação é necessária.`
            });
        }

        return request;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Resolve um pedido de cancelamento (Ação da GESTÃO).
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

    // Se aprovado, o status final é CANCELADO. Se negado, ele volta ao status anterior.
    const previousStatusLog = await RequestStatusLog.findOne({
        where: { requestId },
        order: [['createdAt', 'DESC']],
        offset: 1 // Pega o penúltimo status
    });
    
    if (!previousStatusLog) {
        // Fallback caso algo dê errado e não ache o log anterior
        throw new Error('Could not determine the previous status of the request.');
    }
    
    const newStatus = approved ? 'CANCELADO' : previousStatusLog.status;
    const logNotes = approved 
        ? `Cancelamento aprovado pela gestão. ${notes || ''}`
        : `Cancelamento negado pela gestão. A solicitação retorna ao status anterior (${newStatus}). ${notes || ''}`;

    const transaction = await sequelize.transaction();
    try {
        request.status = newStatus;
        await request.save({ transaction });

        await RequestStatusLog.create({
            requestId,
            status: newStatus,
            responsibleId: managerId,
            notes: logNotes
        }, { transaction });

        await transaction.commit();
        
        // Notificar o solicitante sobre a decisão
        await notificationService.sendNotification({
            recipient: request.solicitant.email,
            subject: `Seu pedido de cancelamento para ${request.protocol} foi resolvido`,
            message: `A gestão ${approved ? 'APROVOU' : 'NEGOU'} seu pedido de cancelamento. A solicitação agora está com o status: ${newStatus}.`
        });

        return request;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};


/**
 * Busca TODAS as solicitações que correspondem aos filtros e perfil, sem paginação.
 * @param {object} filters - Opções de filtro.
 * @param {object} userInfo - Informações do usuário.
 * @returns {Promise<Array<Request>>}
 */
const exportAllRequests = async (filters, userInfo) => {
    const { status, type, companyId, protocol } = filters;
    const { id: userId, profile } = userInfo;
    const where = {};
  
    if (profile === 'SOLICITANTE') where.solicitantId = userId;
    else if (profile === 'GESTAO') {
      const userCompanies = await UserCompany.findAll({ where: { userId }, attributes: ['companyId'] });
      where.companyId = { [Op.in]: userCompanies.map(uc => uc.companyId) };
    }
  
    if (status) where.status = status;
    if (type) where.type = type;
    if (protocol) where.protocol = { [Op.iLike]: `%${protocol}%` };
    if (companyId) where.companyId = companyId;

    const requests = await Request.findAll({
        where,
        order: [['createdAt', 'DESC']],
        include: [
            { model: Company, as: 'company', attributes: ['tradeName'] },
            { model: User, as: 'solicitant', attributes: ['name'] },
            { model: Position, as: 'position', attributes: ['name'] },
            { model: Employee, as: 'employee', attributes: ['name'] },
        ]
    });
    return requests;
};


module.exports = {
  generateProtocol,
  createAdmissionRequest,
  createResignationRequest,
  findAllRequests,
  findRequestById,
  analyzeRequestByManager,
  updateRequestStatusByRh,
    requestCancellation, 
  resolveCancellation,
  exportAllRequests
};