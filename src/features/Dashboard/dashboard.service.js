const { Employee, Request, RequestStatusLog, Workflow, User, Position, UserPermission, Permission, Contract, sequelize } = require('../../models');
const { Op } = require('sequelize');
const { startOfMonth, endOfMonth } = require('date-fns');
const { formatDistanceToNow } = require('date-fns');
const { ptBR } = require('date-fns/locale');

/**
 * Função auxiliar para determinar o escopo de dados do usuário.
 * Retorna cláusulas 'where' para serem usadas nas consultas de Request e Employee.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @param {string} permissionKey - A chave de permissão a ser verificada (ex: 'dashboard:view').
 * @returns {Promise<{requestWhere: object, employeeWhere: object}>} Cláusulas 'where' para filtrar por escopo.
 */
const getScopeWhereClause = async (userInfo, permissionKey) => {
  const requestWhere = {};
  const employeeWhere = {};

  // Admin vê tudo, então não aplicamos filtros de escopo.
  if (userInfo.profile === 'ADMIN') {
    return { requestWhere, employeeWhere };
  }

  // Busca as permissões do usuário para a funcionalidade específica.
  const permissions = await UserPermission.findAll({
    where: {
      userId: userInfo.id,
      permissionKey: permissionKey,
    },
    attributes: ['scopeType', 'scopeId'],
  });

  // Se o usuário não tem a permissão, ele não pode ver nada.
  if (permissions.length === 0) {
    requestWhere.id = null; // Condição que nunca será verdadeira
    employeeWhere.id = null; // Condição que nunca será verdadeira
    return { requestWhere, employeeWhere };
  }

  const allowedCompanyIds = new Set();
  const allowedContractIds = new Set();

  permissions.forEach(p => {
    if (p.scopeType === 'COMPANY' && p.scopeId) {
      allowedCompanyIds.add(p.scopeId);
    } else if (p.scopeType === 'CONTRACT' && p.scopeId) {
      allowedContractIds.add(p.scopeId);
    }
  });

  // Se o usuário tem permissão por empresa, busca todos os contratos dessas empresas.
  if (allowedCompanyIds.size > 0) {
    const contractsFromCompanies = await Contract.findAll({
      where: { companyId: { [Op.in]: Array.from(allowedCompanyIds) } },
      attributes: ['id'],
    });
    contractsFromCompanies.forEach(c => allowedContractIds.add(c.id));
  }

  // Se, após todas as verificações, não houver contratos permitidos, bloqueia o acesso aos dados.
  if (allowedContractIds.size === 0) {
    requestWhere.id = null;
    employeeWhere.id = null;
    return { requestWhere, employeeWhere };
  }

  // Define a cláusula 'where' para filtrar por contratos permitidos.
  const contractFilter = { contractId: { [Op.in]: Array.from(allowedContractIds) } };
  
  return {
    requestWhere: contractFilter,
    employeeWhere: contractFilter,
  };
};

/**
 * Retorna os dados para os cards de estatísticas, respeitando o escopo do usuário.
 * @param {object} { userInfo } - Informações do usuário logado.
 */
const getStats = async ({ userInfo }) => {
  const today = new Date();
  const startOfCurrentMonth = startOfMonth(today);
  const endOfCurrentMonth = endOfMonth(today);

  // Obtém as cláusulas de filtro de escopo para o dashboard.
  const { requestWhere, employeeWhere } = await getScopeWhereClause(userInfo, 'dashboard:view');

  const totalCollaborators = await Employee.count({ where: employeeWhere });

  const admissionWorkflow = await Workflow.findOne({ where: { name: 'ADMISSAO' } });
  const newAdmissions = admissionWorkflow ? await Request.count({
    where: {
      ...requestWhere,
      workflowId: admissionWorkflow.id,
      status: 'ADMITIDO',
      updatedAt: { [Op.between]: [startOfCurrentMonth, endOfCurrentMonth] }
    }
  }) : 0;

  const departureWorkflow = await Workflow.findOne({ where: { name: 'DESLIGAMENTO' } });
  const departures = departureWorkflow ? await Request.count({
    where: {
      ...requestWhere,
      workflowId: departureWorkflow.id,
      status: 'DESLIGAMENTO_CONCLUIDO',
      updatedAt: { [Op.between]: [startOfCurrentMonth, endOfCurrentMonth] }
    }
  }) : 0;

  const activeRequests = await Request.count({
    where: {
      ...requestWhere,
      status: { [Op.notIn]: ['ADMITIDO', 'DESLIGAMENTO_CONCLUIDO', 'CANCELADO', 'REPROVADO_PELA_GESTAO'] }
    }
  });

  return {
    cards: [
      { key: 'totalCollaborators', title: 'Total de Colaboradores', value: totalCollaborators, change: 'Colaboradores ativos no seu escopo.' },
      { key: 'newAdmissions', title: 'Novas Admissões (Mês)', value: `+${newAdmissions}`, change: 'Admissões concluídas no mês atual.' },
      { key: 'departures', title: 'Desligamentos (Mês)', value: `-${departures}`, change: 'Desligamentos concluídos no mês atual.' },
      { key: 'activityRate', title: 'Solicitações Ativas', value: activeRequests, change: 'Processos em andamento.' }
    ]
  };
};

/**
 * Retorna a lista de atividades recentes, respeitando o escopo do usuário.
 * @param {object} { userInfo } - Informações do usuário logado.
 */
const getRecentActivities = async ({ userInfo }) => {
  const { requestWhere } = await getScopeWhereClause(userInfo, 'dashboard:view');

  const recentLogs = await RequestStatusLog.findAll({
    limit: 5,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Request,
        as: 'request',
        attributes: ['protocol', 'candidateName', 'id'],
        where: requestWhere, // Aplica o filtro de escopo no JOIN com a solicitação
        required: true,      // Garante que apenas logs de solicitações permitidas sejam retornados
        include: [{ model: Employee, as: 'employee', attributes: ['name'] }]
      },
      { model: User, as: 'responsible', attributes: ['name'] }
    ]
  });

  return recentLogs.map(log => ({
    description: `Protocolo ${log.request.protocol}`,
    details: `Status: ${log.status.replace(/_/g, ' ')} por ${log.responsible.name}`,
    time: formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ptBR })
  }));
};

/**
 * Retorna dados para o gráfico de distribuição, respeitando o escopo do usuário.
 * @param {object} { userInfo } - Informações do usuário logado.
 */
const getDepartmentDistribution = async ({ userInfo }) => {
  const { employeeWhere } = await getScopeWhereClause(userInfo, 'dashboard:view');

  const distribution = await Employee.findAll({
    where: employeeWhere, // Aplica o filtro de escopo
    attributes: [
      [sequelize.col('position.name'), 'name'],
      [sequelize.fn('COUNT', sequelize.col('Employee.id')), 'total']
    ],
    include: [{ model: Position, as: 'position', attributes: [] }],
    group: ['position.name'],
    order: [[sequelize.fn('COUNT', sequelize.col('Employee.id')), 'DESC']],
    limit: 5
  });

  return distribution.map(item => ({
    name: item.getDataValue('name'),
    total: parseInt(item.getDataValue('total'), 10)
  }));
};

module.exports = {
  getStats,
  getRecentActivities,
  getDepartmentDistribution,
};