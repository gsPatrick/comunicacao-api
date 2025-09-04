const dashboardService = require('./dashboard.service');

const getStats = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile };
    const stats = await dashboardService.getStats({ ...req.query, userInfo }); // Passa userInfo e outros filtros
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas do dashboard', error: error.message });
  }
};

const getRecentActivities = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile };
    const activities = await dashboardService.getRecentActivities({ ...req.query, userInfo }); // Passa userInfo e outros filtros
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar atividades recentes do dashboard', error: error.message });
  }
};

const getDepartmentDistribution = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile };
    const distribution = await dashboardService.getDepartmentDistribution({ ...req.query, userInfo }); // Passa userInfo e outros filtros
    res.status(200).json(distribution);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar distribuição por departamento do dashboard', error: error.message });
  }
};

module.exports = {
  getStats,
  getRecentActivities,
  getDepartmentDistribution,
};