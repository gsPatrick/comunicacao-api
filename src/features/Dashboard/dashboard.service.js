// Mock de dados para simular o que viria do banco de dados

// Dados para os cards de estatísticas
const getStatsData = async () => {
  return {
    cards: [
      { key: 'totalCollaborators', title: 'Total de Colaboradores', value: '142', change: '+3 desde o mês passado' },
      { key: 'newAdmissions', title: 'Novas Admissões (Mês)', value: '+7', change: '+2 na última semana' },
      { key: 'departures', title: 'Desligamentos (Mês)', value: '-4', change: '1 pendente de aprovação' },
      { key: 'activityRate', title: 'Taxa de Atividade', value: '97.8%', change: '+0.2% desde ontem' },
    ]
  };
};

// Dados para a lista de atividades recentes
const getRecentActivitiesData = async () => {
  return [
    { description: 'Admissão de Juliana Martins', details: 'Cargo: Designer de Produto - Aprovado pela Gestão', time: 'Hoje' },
    { description: 'Alteração de Cargo: Ricardo Almeida', details: 'De Analista Jr para Analista Pleno', time: 'Ontem' },
    { description: 'Desligamento de Carlos Pereira', details: 'Status: Concluído', time: 'Há 2 dias' },
    { description: 'Admissão de Fernando Costa', details: 'Cargo: Desenvolvedor Backend - Em análise RH', time: 'Há 2 dias' },
  ];
};

// Dados para o gráfico de distribuição por departamento
const getDepartmentDistributionData = async () => {
  return [
    { name: "T.I.", total: 45 },
    { name: "RH", total: 15 },
    { name: "Financeiro", total: 22 },
    { name: "Marketing", total: 18 },
    { name: "Operações", total: 42 },
  ];
};


module.exports = {
  getStats: getStatsData,
  getRecentActivities: getRecentActivitiesData,
  getDepartmentDistribution: getDepartmentDistributionData,
};