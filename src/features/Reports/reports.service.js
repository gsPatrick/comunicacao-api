const { Request, UserCompany, Employee, Workflow, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * Retorna os dados agregados para os cards de estatísticas.
 * @param {object} filters - Filtros como startDate, endDate, companyId, contractId, userInfo. // Adicionado contractId
 * @returns {Promise<object>} Objeto JSON com os totais de admissões, desligamentos, etc.
 */
const getReportsStats = async (filters) => {
  const { startDate, endDate, companyId, contractId, userInfo } = filters; // Adicionado contractId

  const dateRange = {
    [Op.between]: [startDate || new Date(0), endDate || new Date()]
  };

  const whereClause = {
    createdAt: dateRange
  };

  if (userInfo && userInfo.profile === 'GESTAO') {
    const userCompanies = await UserCompany.findAll({
      where: { userId: userInfo.id },
      attributes: ['companyId']
    });
    const allowedCompanyIds = userCompanies.map(uc => uc.companyId);
    whereClause.companyId = { [Op.in]: allowedCompanyIds };
  }

  if (companyId) {
    whereClause.companyId = companyId;
  }

  // --- NOVO: Adiciona filtro por contrato ---
  if (contractId) {
    whereClause.contractId = contractId;
  }
  // -----------------------------------------

  const workflows = await Workflow.findAll({
    where: { name: { [Op.in]: ['ADMISSAO', 'DESLIGAMENTO', 'SUBSTITUICAO'] } },
    attributes: ['id', 'name']
  });

  const workflowMap = workflows.reduce((acc, wf) => {
    acc[wf.name] = wf.id;
    return acc;
  }, {});

  const admissions = await Request.count({
    where: {
      ...whereClause,
      workflowId: workflowMap.ADMISSAO,
      status: 'ADMITIDO'
    }
  });

  const departures = await Request.count({
    where: {
      ...whereClause,
      workflowId: workflowMap.DESLIGAMENTO,
      status: 'DESLIGAMENTO_CONCLUIDO'
    }
  });

  const replacements = await Request.count({
    where: {
      ...whereClause,
      workflowId: workflowMap.SUBSTITUICAO,
      status: 'ADMITIDO'
    }
  });

  let turnover = 0;
  const totalEmployeesAtStart = await Employee.count({
    where: {
      admissionDate: { [Op.lte]: startDate || new Date(0) }
    }
  });
  if (totalEmployeesAtStart > 0) {
      turnover = ((admissions + departures) / 2 / totalEmployeesAtStart) * 100;
  }

  return { admissions, departures, turnover: parseFloat(turnover.toFixed(2)), replacements };
};

/**
 * Retorna os dados para o gráfico de barras de contratações mensais.
 * @param {object} filters - Filtros como startDate, endDate, companyId, contractId, userInfo. // Adicionado contractId
 * @returns {Promise<Array<object>>} Um array de objetos com total de admissões por mês.
 */
const getHiringOverview = async (filters) => {
  const { startDate, endDate, companyId, contractId, userInfo } = filters; // Adicionado contractId

  const dateRange = {
    [Op.between]: [startDate || new Date(0), endDate || new Date()]
  };

  const whereClause = {
    createdAt: dateRange
  };

  if (userInfo && userInfo.profile === 'GESTAO') {
    const userCompanies = await UserCompany.findAll({
      where: { userId: userInfo.id },
      attributes: ['companyId']
    });
    const allowedCompanyIds = userCompanies.map(uc => uc.companyId);
    whereClause.companyId = { [Op.in]: allowedCompanyIds };
  }

  if (companyId) {
    whereClause.companyId = companyId;
  }

  // --- NOVO: Adiciona filtro por contrato ---
  if (contractId) {
    whereClause.contractId = contractId;
  }
  // -----------------------------------------

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