const { Request, UserCompany, Employee, Workflow, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * Retorna os dados agregados para os cards de estatísticas.
 * @param {object} filters - Filtros como startDate, endDate, companyId, userInfo.
 * @returns {Promise<object>} Objeto JSON com os totais de admissões, desligamentos, etc.
 */
const getReportsStats = async (filters) => {
  const { startDate, endDate, companyId, userInfo } = filters;

  const dateRange = {
    [Op.between]: [startDate || new Date(0), endDate || new Date()] // Default para todo o histórico se não especificado
  };

  const whereClause = {
    createdAt: dateRange
  };

  // Lógica de permissão para GESTAO
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

  // Buscar os Workflows de interesse
  const workflows = await Workflow.findAll({
    where: { name: { [Op.in]: ['ADMISSAO', 'DESLIGAMENTO', 'SUBSTITUICAO'] } },
    attributes: ['id', 'name']
  });

  const workflowMap = workflows.reduce((acc, wf) => {
    acc[wf.name] = wf.id;
    return acc;
  }, {});

  // Contar o número de Requests do tipo ADMISSAO
  const admissions = await Request.count({
    where: {
      ...whereClause,
      workflowId: workflowMap.ADMISSAO,
      status: 'ADMITIDO' // Considerar apenas as admitidas para estatística de sucesso
    }
  });

  // Contar o número de Requests do tipo DESLIGAMENTO
  const departures = await Request.count({
    where: {
      ...whereClause,
      workflowId: workflowMap.DESLIGAMENTO,
      status: 'DESLIGAMENTO_CONCLUIDO' // Considerar apenas os desligamentos concluídos
    }
  });

  // Contar o número de Requests do tipo SUBSTITUICAO
  const replacements = await Request.count({
    where: {
      ...whereClause,
      workflowId: workflowMap.SUBSTITUICAO,
      status: 'ADMITIDO' // Considerar as substituições que resultaram em admissão
    }
  });

  // Calcular o Turnover (simplificado para o período)
  let turnover = 0;
  const totalEmployeesAtStart = await Employee.count({
    where: {
      admissionDate: { [Op.lte]: startDate || new Date(0) } // Funcionários que já estavam antes ou no início do período
    }
  });
  if (totalEmployeesAtStart > 0) {
      turnover = ((admissions + departures) / 2 / totalEmployeesAtStart) * 100; // Cálculo simplificado
  }


  return { admissions, departures, turnover: parseFloat(turnover.toFixed(2)), replacements };
};

/**
 * Retorna os dados para o gráfico de barras de contratações mensais.
 * @param {object} filters - Filtros como startDate, endDate, companyId, userInfo.
 * @returns {Promise<Array<object>>} Um array de objetos com total de admissões por mês.
 */
const getHiringOverview = async (filters) => {
  const { startDate, endDate, companyId, userInfo } = filters;

  const dateRange = {
    [Op.between]: [startDate || new Date(0), endDate || new Date()]
  };

  const whereClause = {
    createdAt: dateRange
  };

  // Lógica de permissão para GESTAO
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

  const admissionWorkflow = await Workflow.findOne({ where: { name: 'ADMISSAO' }, attributes: ['id'] });
  if (!admissionWorkflow) {
    return []; // Retorna vazio se o workflow de ADMISSAO não existir
  }
  whereClause.workflowId = admissionWorkflow.id;
  whereClause.status = 'ADMITIDO'; // Contar apenas as admissões concluídas

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