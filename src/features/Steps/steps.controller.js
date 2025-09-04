const stepService = require('./steps.service');

const createStep = async (req, res) => {
  try {
    const step = await stepService.createStep(req.body);
    return res.status(201).json(step);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Step name already exists.' });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getAllSteps = async (req, res) => {
  try {
    const stepsData = await stepService.findAllSteps(req.query);
    return res.status(200).json(stepsData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getStepById = async (req, res) => {
  try {
    const step = await stepService.findStepById(req.params.id);
    if (!step) {
      return res.status(404).json({ error: 'Step not found.' });
    }
    return res.status(200).json(step);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const updateStep = async (req, res) => {
  try {
    const updatedStep = await stepService.updateStep(req.params.id, req.body);
    if (!updatedStep) {
      return res.status(404).json({ error: 'Step not found.' });
    }
    return res.status(200).json(updatedStep);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Step name already exists.' });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const deleteStep = async (req, res) => {
  try {
    const success = await stepService.deleteStep(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Step not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    // Captura erros de restrição de chave estrangeira, por exemplo
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ error: 'Cannot delete step as it is linked to one or more workflows.' });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

module.exports = {
  createStep,
  getAllSteps,
  getStepById,
  updateStep,
  deleteStep,
};