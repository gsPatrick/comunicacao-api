const positionService = require('./position.service');

const createPosition = async (req, res) => {
  try {
    const position = await positionService.createPosition(req.body);
    return res.status(201).json(position);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Position name already exists.' });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getAllPositions = async (req, res) => {
  try {
    const positionsData = await positionService.findAllPositions(req.query);
    return res.status(200).json(positionsData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getPositionById = async (req, res) => {
  try {
    const position = await positionService.findPositionById(req.params.id);
    if (!position) {
      return res.status(404).json({ error: 'Position not found.' });
    }
    return res.status(200).json(position);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const updatePosition = async (req, res) => {
  try {
    const updatedPosition = await positionService.updatePosition(req.params.id, req.body);
    if (!updatedPosition) {
      return res.status(404).json({ error: 'Position not found.' });
    }
    return res.status(200).json(updatedPosition);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const deletePosition = async (req, res) => {
  try {
    const success = await positionService.deletePosition(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Position not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const linkCompanies = async (req, res) => {
    try {
        const { companyIds } = req.body;
        if (!companyIds || !Array.isArray(companyIds)) {
            return res.status(400).json({ error: 'companyIds must be an array.' });
        }
        await positionService.linkPositionToCompanies(req.params.id, companyIds);
        return res.status(200).json({ message: 'Position linked to companies successfully.' });
    } catch (error) {
        return res.status(404).json({ error: error.message });
    }
};

const unlinkCompany = async (req, res) => {
    try {
        await positionService.unlinkPositionFromCompany(req.params.id, req.params.companyId);
        return res.status(204).send();
    } catch (error) {
        return res.status(404).json({ error: error.message });
    }
};

module.exports = {
  createPosition,
  getAllPositions,
  getPositionById,
  updatePosition,
  deletePosition,
  linkCompanies,
  unlinkCompany
};