const { Request, Employee, Workflow, Position, Company, Contract, WorkLocation, UserCompany, RequestStatusLog, User, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * Retorna um objeto com filtros de empresa baseados no perfil do usuário.
 * Se o perfil for GESTAO, filtra pelas empresas associadas ao usuário.
 * Para outros perfis (ADMIN, RH, SOLICITANTE sem vínculo direto), retorna um filtro vazio ou um filtro específico se companyId for fornecido.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @param {string} [companyIdFilter] - ID de empresa opcional para filtro adicional.
 * @returns {Promise<object>} Objeto `where` para Company ou um array de IDs para usar com `[Op.in]`.
 */
const getCompanyFilters = async (userInfo, companyIdFilter) => {
  const companyWhere = {};
  let allowedCompanyIds = [];

  if (userInfo && userInfo.profile === 'GESTAO') {
    const userCompanies = await UserCompany.findAll({
      where: { userId: userInfo.id },
      attributes: ['companyId']
    });
    allowedCompanyIds = userCompanies.map(uc => uc.companyId);
    if (allowedCompanyIds.length > 0) {
      companyWhere.id = { [Op.in]: allowedCompanyIds };
    } else {
      // Se o gestor não tem empresas associadas, ele não deve ver nenhuma
      companyWhere.id = { [Op.in]: [] };
    }
  }

  // Se um companyId específico for fornecido, ele deve ser respeitado,
  // mas também deve estar dentro das empresas permitidas para GESTAO
  if (companyIdFilter) {
    if (userInfo && userInfo.profile === 'GESTAO') {
      if (!allowedCompanyIds.includes(companyIdFilter)) {
        // Gestor tentou acessar uma empresa que não lhe pertence
        companyWhere.id = { [Op.in]: [] }; // Garante que nenhum resultado seja retornado
      } else {
        companyWhere.id = companyIdFilter;
      }
    } else {
      companyWhere.id = companyIdFilter;
    }
  }

  return companyWhere;
};

/**
 * Retorna os dados para os cards de estatísticas.
 * @param {object} filters - Filtros como companyId, userInfo.
 * @returns {Promise<object>} Dados agregados para o dashboard.
 */
const getStatsData = async (filters) => {
  const { companyId, userInfo } = filters;

  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const lastMonthStart = new Date(currentMonthStart);
  lastMonthStart.setMonth(currentMonthStart.getMonth() - 1);

  const lastMonthEnd = new Date(currentMonthStart);
  lastMonthEnd.setDate(0); // Último dia do mês anterior

  const whereClause = {};
  let employeeWhereClause = {};
  let requestCompanyWhere = {};

  if (userInfo && userInfo.profile === 'GESTAO') {
    const companyFilters = await getCompanyFilters(userInfo, companyId);
    if (companyFilters.id && companyFilters.id[Op.in] && companyFilters.id[Op.in].length === 0) {
        // Nenhuma empresa permitida para o gestor
        return {
            cards: [
                { key: 'totalCollaborators', title: 'Total de Colaboradores', value: '0', change: 'N/A' },
                { key: 'newAdmissions', title: 'Novas Admissões (Mês)', value: '0', change: 'N/A' },
                { key: 'departures', title: 'Desligamentos (Mês)', value: '0', change: 'N/A' },
                { key: 'netChange', title: 'Mudança Líquida (Mês)', value: '0', change: 'N/A' },
            ]
        };
    }
    requestCompanyWhere = companyFilters; // Aplica o filtro da empresa
    employeeWhereClause.companyId = companyFilters.id; // Assume que employee tem companyId via contrato
  } else if (companyId) {
    requestCompanyWhere.id = companyId;
    employeeWhereClause.companyId = companyId;
  }
  
  // Buscar os Workflows de interesse
  const workflows = await Workflow.findAll({
    where: { name: { [Op.in]: ['ADMISSAO', 'DESLIGAMENTO'] } },
    attributes: ['id', 'name']
  });

  const workflowMap = workflows.reduce((acc, wf) => {
    acc[wf.name] = wf.id;
    return acc;
  }, {});

  // 1. Total de Colaboradores (simplificado, sem isActive no modelo Employee)
  // Contamos funcionários associados a contratos de empresas permitidas
  const totalCollaborators = await Employee.count({
    include: [{
      model: Contract,
      as: 'contract',
      include: [{
        model: Company,
        as: 'company',
        where: requestCompanyWhere, // Filtra por empresas permitidas
        required: true // Força o JOIN
      }],
      required: true
    }]
  });

  // 2. Novas Admissões (Mês Atual)
  const newAdmissionsCurrentMonth = await Request.count({
    where: {
      workflowId: workflowMap.ADMISSAO,
      status: 'ADMITIDO',
      createdAt: { [Op.gte]: currentMonthStart },
    },
    include: [{
      model: Company,
      as: 'company',
      where: requestCompanyWhere,
      required: true
    }]
  });

  // Novas Admissões (Mês Passado)
  const newAdmissionsLastMonth = await Request.count({
    where: {
      workflowId: workflowMap.ADMISSAO,
      status: 'ADMITIDO',
      createdAt: { [Op.between]: [lastMonthStart, lastMonthEnd] },
    },
    include: [{
      model: Company,
      as: 'company',
      where: requestCompanyWhere,
      required: true
    }]
  });

  // 3. Desligamentos (Mês Atual)
  const departuresCurrentMonth = await Request.count({
    where: {
      workflowId: workflowMap.DESLIGAMENTO,
      status: 'DESLIGAMENTO_CONCLUIDO',
      createdAt: { [Op.gte]: currentMonthStart },
    },
    include: [{
      model: Company,
      as: 'company',
      where: requestCompanyWhere,
      required: true
    }]
  });

  // Desligamentos (Mês Passado)
  const departuresLastMonth = await Request.count({
    where: {
      workflowId: workflowMap.DESLIGAMENTO,
      status: 'DESLIGAMENTO_CONCLUIDO',
      createdAt: { [Op.between]: [lastMonthStart, lastMonthEnd] },
    },
    include: [{
      model: Company,
      as: 'company',
      where: requestCompanyWhere,
      required: true
    }]
  });

  // Cálculo da mudança líquida (Net Change)
  const netChangeCurrentMonth = newAdmissionsCurrentMonth - departuresCurrentMonth;
  const netChangeLastMonth = newAdmissionsLastMonth - departuresLastMonth;
  const netChangeComparison = netChangeCurrentMonth - netChangeLastMonth;

  // Formatação das mudanças
  const formatChange = (current, previous) => {
    if (previous === 0) return current > 0 ? `+${current}` : `${current}`; // Evita divisão por zero
    const diff = current - previous;
    const percentage = (diff / previous * 100).toFixed(1);
    return `${diff > 0 ? '+' : ''}${diff} (${percentage}%)`;
  };

  return {
    cards: [
      { key: 'totalCollaborators', title: 'Total de Colaboradores', value: totalCollaborators.toString(), change: 'Base atual' },
      { key: 'newAdmissions', title: 'Novas Admissões (Mês)', value: `+${newAdmissionsCurrentMonth}`, change: formatChange(newAdmissionsCurrentMonth, newAdmissionsLastMonth) },
      { key: 'departures', title: 'Desligamentos (Mês)', value: `${departuresCurrentMonth > 0 ? '-' : ''}${departuresCurrentMonth}`, change: formatChange(departuresCurrentMonth, departuresLastMonth) },
      { key: 'netChange', title: 'Mudança Líquida (Mês)', value: `${netChangeCurrentMonth > 0 ? '+' : ''}${netChangeCurrentMonth}`, change: formatChange(netChangeCurrentMonth, netChangeLastMonth) },
    ]
  };
};

/**
 * Retorna uma lista de atividades recentes.
 * @param {object} filters - Filtros como companyId, userInfo.
 * @returns {Promise<Array<object>>} Lista de atividades recentes.
 */
const getRecentActivitiesData = async (filters) => {
  const { companyId, userInfo } = filters;

  const requestCompanyWhere = {};
  if (userInfo && userInfo.profile === 'GESTAO') {
    const companyFilters = await getCompanyFilters(userInfo, companyId);
    if (companyFilters.id && companyFilters.id[Op.in] && companyFilters.id[Op.in].length === 0) {
        return []; // Nenhuma empresa permitida para o gestor
    }
    requestCompanyWhere.id = companyFilters.id;
  } else if (companyId) {
    requestCompanyWhere.id = companyId;
  }

  const logs = await RequestStatusLog.findAll({
    limit: 5,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Request,
        as: 'request',
        attributes: ['id', 'protocol', 'status', 'candidateName', 'employeeId'],
        include: [
            { model: Workflow, as: 'workflow', attributes: ['name'] },
            { model: Company, as: 'company', attributes: ['tradeName'], where: requestCompanyWhere, required: true },
            { model: Employee, as: 'employee', attributes: ['name'] },
            { model: Position, as: 'position', attributes: ['name'] }, // Para admissão
        ],
        required: true // Garante que apenas logs de requests visíveis sejam retornados
      },
      { model: User, as: 'responsible', attributes: ['name', 'profile'] }
    ]
  });

  return logs.map(log => {
    const request = log.request;
    const responsible = log.responsible;
    let description = '';
    let details = '';

    const timeDiff = new Date().getTime() - new Date(log.createdAt).getTime();
    const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const time = daysAgo === 0 ? 'Hoje' : (daysAgo === 1 ? 'Ontem' : `Há ${daysAgo} dias`);

    if (!request) { // Fallback para logs sem request associada (exceção)
        description = `Atualização de status: ${log.status}`;
        details = `Por: ${responsible ? responsible.name : 'Desconhecido'}`;
    } else if (request.workflow.name === 'ADMISSAO') {
      description = `Admissão de ${request.candidateName || 'Candidato'}`;
      details = `Status: ${request.status} - Empresa: ${request.company ? request.company.tradeName : 'N/A'}`;
    } else if (request.workflow.name === 'DESLIGAMENTO') {
      description = `Desligamento de ${request.employee ? request.employee.name : 'Funcionário'}`;
      details = `Status: ${request.status} - Empresa: ${request.company ? request.company.tradeName : 'N/A'}`;
    } else if (request.workflow.name === 'SUBSTITUICAO') {
        description = `Substituição de ${request.employee ? request.employee.name : 'Funcionário'}`;
        details = `Status: ${request.status} - Empresa: ${request.company ? request.company.tradeName : 'N/A'}`;
    }
    
    // Adicionar a pessoa responsável pelo log
    details += ` (por ${responsible ? responsible.name : 'Desconhecido'})`;


    return {
      description,
      details,
      time
    };
  });
};

/**
 * Retorna a distribuição de colaboradores por cargo/departamento.
 * @param {object} filters - Filtros como companyId, userInfo.
 * @returns {Promise<Array<object>>} Distribuição por cargo.
 */
const getDepartmentDistributionData = async (filters) => {
  const { companyId, userInfo } = filters;

  const employeeCompanyWhere = {};
  if (userInfo && userInfo.profile === 'GESTAO') {
    const companyFilters = await getCompanyFilters(userInfo, companyId);
    if (companyFilters.id && companyFilters.id[Op.in] && companyFilters.id[Op.in].length === 0) {
        return []; // Nenhuma empresa permitida para o gestor
    }
    employeeCompanyWhere.id = companyFilters.id; // Filtra por empresas permitidas
  } else if (companyId) {
    employeeCompanyWhere.id = companyId;
  }

  const distribution = await Employee.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('Employee.id')), 'total']
    ],
    include: [
      {
        model: Position,
        as: 'position',
        attributes: ['name'],
        required: true,
      },
      {
        model: Contract,
        as: 'contract',
        attributes: [],
        include: [{
          model: Company,
          as: 'company',
          attributes: [],
          where: employeeCompanyWhere,
          required: true
        }],
        required: true
      }
    ],
    group: ['position.name'],
    order: [[sequelize.literal('total'), 'DESC']]
  });

  return distribution.map(item => ({
    name: item.position.name,
    total: parseInt(item.dataValues.total, 10)
  }));
};


module.exports = {
  getStats: getStatsData,
  getRecentActivities: getRecentActivitiesData,
  getDepartmentDistribution: getDepartmentDistributionData,
};