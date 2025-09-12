const { Request, Employee, Workflow, UserPermission,Permission, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * Função auxiliar para determinar o escopo de dados que um usuário pode acessar.
 * Busca as permissões do usuário para 'reports:view' e retorna os IDs das
 * empresas e/ou contratos permitidos.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<{allowedCompanyIds: Array<string>|null, allowedContractIds: Array<string>|null}>}
 *          Retorna `null` se não houver restrição (Admin) ou um array de IDs permitidos.
 *          Um array vazio significa que o usuário não tem acesso a nenhum recurso específico.
 */
const getPermittedScope = async (userInfo) => {
  // Admins não têm restrições de escopo.
  if (!userInfo || userInfo.profile === 'ADMIN') {
    return { allowedCompanyIds: null, allowedContractIds: null };
  }

  const permissions = await UserPermission.findAll({
    where: {
      userId: userInfo.id,
      permissionKey: 'reports:view',
    },
    attributes: ['scopeType', 'scopeId'],
  });

  // Se o usuário não tem a permissão 'reports:view', ele não pode ver nada.
  if (permissions.length === 0) {
    return { allowedCompanyIds: [], allowedContractIds: [] };
  }
  
  // Verifica se existe uma permissão global (sem escopo definido) para este usuário.
  const hasGlobalPermission = permissions.some(p => !p.scopeType);
  if (hasGlobalPermission) {
    return { allowedCompanyIds: null, allowedContractIds: null };
  }

  // Separa os IDs por tipo de escopo (Empresa ou Contrato)
  const companyIds = permissions
    .filter(p => p.scopeType === 'COMPANY' && p.scopeId)
    .map(p => p.scopeId);
  
  const contractIds = permissions
    .filter(p => p.scopeType === 'CONTRACT' && p.scopeId)
    .map(p => p.scopeId);

  return { allowedCompanyIds: companyIds, allowedContractIds: contractIds };
};


/**
 * Retorna os dados agregados para os cards de estatísticas.
 * @param {object} filters - Filtros como startDate, endDate, companyId, contractId, userInfo.
 * @returns {Promise<object>} Objeto JSON com os totais de admissões, desligamentos, etc.
 */
const getReportsStats = async (filters) => {
  const { startDate, endDate, companyId, contractId, userInfo } = filters;

  // 1. Determinar o escopo de acesso do usuário
  const scope = await getPermittedScope(userInfo);
  
  // Se o escopo for um array vazio, o usuário não tem acesso a nenhum dado.
  if (scope.allowedCompanyIds?.length === 0 && scope.allowedContractIds?.length === 0) {
    return { admissions: 0, departures: 0, turnover: 0, replacements: 0 };
  }

  const whereClause = {
    createdAt: {
      [Op.between]: [startDate || new Date(0), endDate || new Date()]
    }
  };

  // 2. Construir a cláusula 'where' com base no escopo e nos filtros
  const scopeConditions = [];
  if (scope.allowedCompanyIds) {
    scopeConditions.push({ companyId: { [Op.in]: scope.allowedCompanyIds } });
  }
  if (scope.allowedContractIds) {
    scopeConditions.push({ contractId: { [Op.in]: scope.allowedContractIds } });
  }

  if (scopeConditions.length > 0) {
    whereClause[Op.and] = whereClause[Op.and] || [];
    whereClause[Op.and].push({ [Op.or]: scopeConditions });
  }
  
  // 3. Aplicar os filtros da requisição, respeitando o escopo do usuário
  if (companyId) {
    // Se o usuário tem um escopo de empresas, o companyId do filtro deve estar nesse escopo
    if (scope.allowedCompanyIds && !scope.allowedCompanyIds.includes(companyId)) {
        return { admissions: 0, departures: 0, turnover: 0, replacements: 0 }; // Acesso negado
    }
    whereClause.companyId = companyId;
  }

  if (contractId) {
    if (scope.allowedContractIds && !scope.allowedContractIds.includes(contractId)) {
        return { admissions: 0, departures: 0, turnover: 0, replacements: 0 }; // Acesso negado
    }
    whereClause.contractId = contractId;
  }

  // 4. Buscar os dados
  const workflows = await Workflow.findAll({
    where: { name: { [Op.in]: ['ADMISSAO', 'DESLIGAMENTO', 'SUBSTITUICAO'] } },
    attributes: ['id', 'name']
  });
  const workflowMap = workflows.reduce((acc, wf) => ({ ...acc, [wf.name]: wf.id }), {});

  const [admissions, departures, replacements, totalEmployeesAtStart] = await Promise.all([
    Request.count({ where: { ...whereClause, workflowId: workflowMap.ADMISSAO, status: 'ADMITIDO' } }),
    Request.count({ where: { ...whereClause, workflowId: workflowMap.DESLIGAMENTO, status: 'DESLIGAMENTO_CONCLUIDO' } }),
    Request.count({ where: { ...whereClause, workflowId: workflowMap.SUBSTITUICAO, status: 'ADMITIDO' } }),
    Employee.count({ where: { admissionDate: { [Op.lte]: startDate || new Date(0) } } }) // Turnover ainda é global
  ]);

  const turnover = totalEmployeesAtStart > 0 ? (((admissions + departures) / 2 / totalEmployeesAtStart) * 100) : 0;

  return { admissions, departures, turnover: parseFloat(turnover.toFixed(2)), replacements };
};

/**
 * Retorna os dados para o gráfico de barras de contratações mensais.
 * @param {object} filters - Filtros como startDate, endDate, companyId, contractId, userInfo.
 * @returns {Promise<Array<object>>} Um array de objetos com total de admissões por mês.
 */
const getHiringOverview = async (filters) => {
  const { startDate, endDate, companyId, contractId, userInfo } = filters;

  const scope = await getPermittedScope(userInfo);
  if (scope.allowedCompanyIds?.length === 0 && scope.allowedContractIds?.length === 0) {
    return [];
  }

  const whereClause = {
    createdAt: {
      [Op.between]: [startDate || new Date(0), endDate || new Date()]
    }
  };

  const scopeConditions = [];
  if (scope.allowedCompanyIds) {
    scopeConditions.push({ companyId: { [Op.in]: scope.allowedCompanyIds } });
  }
  if (scope.allowedContractIds) {
    scopeConditions.push({ contractId: { [Op.in]: scope.allowedContractIds } });
  }

  if (scopeConditions.length > 0) {
    whereClause[Op.and] = whereClause[Op.and] || [];
    whereClause[Op.and].push({ [Op.or]: scopeConditions });
  }

  if (companyId) {
    if (scope.allowedCompanyIds && !scope.allowedCompanyIds.includes(companyId)) {
        return [];
    }
    whereClause.companyId = companyId;
  }

  if (contractId) {
    if (scope.allowedContractIds && !scope.allowedContractIds.includes(contractId)) {
        return [];
    }
    whereClause.contractId = contractId;
  }

  const admissionWorkflow = await Workflow.findOne({ where: { name: 'ADMISSAO' }, attributes: ['id'] });
  if (!admissionWorkflow) {
    return [];
  }
  whereClause.workflowId = admissionWorkflow.id;
  whereClause.status = 'ADMITIDO';

  const monthlyHires = await Request.findAll({
    attributes: [
      [sequelize.fn('date_trunc', 'month', sequelize.col('Request.created_at')), 'month'],
      [sequelize.fn('COUNT', sequelize.col('Request.id')), 'total']
    ],
    where: whereClause,
    group: [sequelize.fn('date_trunc', 'month', sequelize.col('Request.created_at'))],
    order: [[sequelize.fn('date_trunc', 'month', sequelize.col('Request.created_at')), 'ASC']]
  });

  return monthlyHires.map(item => ({
    name: new Date(item.dataValues.month).toLocaleString('pt-BR', { month: 'short', year: 'numeric' }),
    total: parseInt(item.dataValues.total, 10)
  }));
};

module.exports = {
  getReportsStats,
  getHiringOverview,
};