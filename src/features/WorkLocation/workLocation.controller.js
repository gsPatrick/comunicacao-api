const workLocationService = require('./workLocation.service');
const xlsxService = require('../../utils/xlsx.service'); // Importa o serviço de XLSX

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
    const userInfo = { id: req.userId, profile: req.userProfile };
    const locationsData = await workLocationService.findAllWorkLocations(req.query, userInfo);
    return res.status(200).json(locationsData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getWorkLocationById = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile };
    const workLocation = await workLocationService.findWorkLocationById(req.params.id, userInfo);
    if (!workLocation) {
      return res.status(404).json({ error: 'Work location not found or access denied.' });
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

// --- NOVA FUNÇÃO DE EXPORTAÇÃO ---
const exportWorkLocations = async (req, res) => {
    try {
        const userInfo = { id: req.userId, profile: req.userProfile };
        const workLocations = await workLocationService.exportAllWorkLocations(req.query, userInfo);

        const formattedData = workLocations.map(wl => ({
            'Nome do Local': wl.name,
            'Endereço': wl.address,
            'Contrato Vinculado': wl.contract ? wl.contract.name : '',
        }));
        
        const buffer = xlsxService.jsonToXlsxBuffer(formattedData);
        const filename = `locais-de-trabalho-${new Date().toISOString().slice(0,10)}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ error: 'Failed to export data.', details: error.message });
    }
};

module.exports = {
  createWorkLocation,
  getAllWorkLocations,
  getWorkLocationById,
  updateWorkLocation,
  deleteWorkLocation,
  exportWorkLocations, // Adicionado
};