const reportService = require('./reports.service');

const getStats = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile };
    const stats = await reportService.getReportsStats({ ...req.query, userInfo });
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas de relatórios', error: error.message });
  }
};

const getHiringOverview = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile };
    const overview = await reportService.getHiringOverview({ ...req.query, userInfo });
    res.status(200).json(overview);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar visão geral de contratações', error: error.message });
  }
};

module.exports = {
  getStats,
  getHiringOverview,
};