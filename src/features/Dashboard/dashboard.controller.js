const dashboardService = require('./dashboard.service');

const getStats = async (req, res) => {
  try {
    const stats = await dashboardService.getStats();
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas', error: error.message });
  }
};

const getRecentActivities = async (req, res) => {
  try {
    const activities = await dashboardService.getRecentActivities();
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar atividades recentes', error: error.message });
  }
};

const getDepartmentDistribution = async (req, res) => {
  try {
    const distribution = await dashboardService.getDepartmentDistribution();
    res.status(200).json(distribution);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar distribuição por departamento', error: error.message });
  }
};

module.exports = {
  getStats,
  getRecentActivities,
  getDepartmentDistribution,
};