const { Employee, Request, RequestStatusLog, Workflow, User, Position, sequelize } = require('../../models');
const { Op } = require('sequelize');
const { startOfMonth, endOfMonth } = require('date-fns');

// Dados para os cards de estatísticas
const getStatsData = async () => {
  const today = new Date();
  const startOfCurrentMonth = startOfMonth(today);
  const endOfCurrentMonth = endOfMonth(today);

  const totalCollaborators = await Employee.count();

  const admissionWorkflow = await Workflow.findOne({ where: { name: 'ADMISSAO' } });
  const newAdmissions = admissionWorkflow ? await Request.count({
    where: {
      workflowId: admissionWorkflow.id,
      status: 'ADMITIDO',
      updatedAt: { [Op.between]: [startOfCurrentMonth, endOfCurrentMonth] }
    }
  }) : 0;

  const departureWorkflow = await Workflow.findOne({ where: { name: 'DESLIGAMENTO' } });
  const departures = departureWorkflow ? await Request.count({
    where: {
      workflowId: departureWorkflow.id,
      status: 'DESLIGAMENTO_CONCLUIDO',
      updatedAt: { [Op.between]: [startOfCurrentMonth, endOfCurrentMonth] }
    }
  }) : 0;

  return {
    cards: [
      { key: 'totalCollaborators', title: 'Total de Colaboradores', value: totalCollaborators, change: 'Número total de colaboradores ativos.' },
      { key: 'newAdmissions', title: 'Novas Admissões (Mês)', value: `+${newAdmissions}`, change: 'Admissões concluídas no mês atual.' },
      { key: 'departures', title: 'Desligamentos (Mês)', value: `-${departures}`, change: 'Desligamentos concluídos no mês atual.' },
      { key: 'activityRate', title: 'Solicitações Ativas', value: await Request.count({ where: { status: { [Op.notIn]: ['ADMITIDO', 'DESLIGAMENTO_CONCLUIDO', 'CANCELADO', 'REPROVADO_PELA_GESTAO'] } } }), change: 'Processos em andamento.' }
    ]
  };
};

// Dados para a lista de atividades recentes
const getRecentActivitiesData = async () => {
  const recentLogs = await RequestStatusLog.findAll({
    limit: 5,
    order: [['createdAt', 'DESC']],
    include: [
      { model: Request, as: 'request', attributes: ['protocol', 'candidateName'], include: [{ model: Employee, as: 'employee', attributes: ['name'] }] },
      { model: User, as: 'responsible', attributes: ['name'] }
    ]
  });

  return recentLogs.map(log => ({
    description: `Protocolo ${log.request.protocol}`,
    details: `Status: ${log.status.replace(/_/g, ' ')} por ${log.responsible.name}`,
    time: formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: require('date-fns/locale/pt-BR') })
  }));
};

// Dados para o gráfico de distribuição
const getDepartmentDistributionData = async () => {
  // Como não há "Departamento", vamos agrupar por "Cargo" (Position)
  const distribution = await Employee.findAll({
    attributes: [
      [sequelize.col('position.name'), 'name'],
      [sequelize.fn('COUNT', sequelize.col('Employee.id')), 'total']
    ],
    include: [{ model: Position, as: 'position', attributes: [] }],
    group: ['position.name'],
    order: [[sequelize.fn('COUNT', sequelize.col('Employee.id')), 'DESC']],
    limit: 5 // Pega os 5 maiores "departamentos" (cargos)
  });

  return distribution.map(item => ({
    name: item.getDataValue('name'),
    total: parseInt(item.getDataValue('total'), 10)
  }));
};

// Precisamos importar a função de date-fns
const { formatDistanceToNow } = require('date-fns');

module.exports = {
  getStats: getStatsData,
  getRecentActivities: getRecentActivitiesData,
  getDepartmentDistribution: getDepartmentDistributionData,
};