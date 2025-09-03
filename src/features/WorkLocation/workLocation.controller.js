const workLocationService = require('./workLocation.service');

const createWorkLocation = async (req, res) => {
  try {
    const workLocation = await workLocationService.createWorkLocation(req.body);
    return res.status(201).json(workLocation);
  } catch (error) {
    if (error.message === 'Contract not found.') {
        return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getAllWorkLocations = async (req, res) => {
  try {
    const locationsData = await workLocationService.findAllWorkLocations(req.query);
    return res.status(200).json(locationsData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getWorkLocationById = async (req, res) => {
  try {
    const workLocation = await workLocationService.findWorkLocationById(req.params.id);
    if (!workLocation) {
      return res.status(404).json({ error: 'Work location not found.' });
    }
    return res.status(200).json(workLocation);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const updateWorkLocation = async (req, res) => {
  try {
    const updatedLocation = await workLocationService.updateWorkLocation(req.params.id, req.body);
    if (!updatedLocation) {
      return res.status(404).json({ error: 'Work location not found.' });
    }
    return res.status(200).json(updatedLocation);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const deleteWorkLocation = async (req, res) => {
  try {
    const success = await workLocationService.deleteWorkLocation(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Work location not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

module.exports = {
  createWorkLocation,
  getAllWorkLocations,
  getWorkLocationById,
  updateWorkLocation,
  deleteWorkLocation,
};