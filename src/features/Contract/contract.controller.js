
const contractService = require('./contract.service');
const xlsxService = require('../../utils/xlsx.service'); // Importa o serviço de XLSX

const createContract = async (req, res) => {
  try {
    const contract = await contractService.createContract(req.body);
    return res.status(201).json(contract);
  } catch (error) {
    if (error.message === 'Company not found.') {
        return res.status(404).json({ error: error.message });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Contract number already exists.' });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getAllContracts = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile };
    const contractsData = await contractService.findAllContracts(req.query, userInfo);
    return res.status(200).json(contractsData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getContractById = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile };
    const contract = await contractService.findContractById(req.params.id, userInfo);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found or access denied.' });
    }
    return res.status(200).json(contract);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const updateContract = async (req, res) => {
  try {
    const updatedContract = await contractService.updateContract(req.params.id, req.body);
    if (!updatedContract) {
      return res.status(404).json({ error: 'Contract not found.' });
    }
    return res.status(200).json(updatedContract);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const deleteContract = async (req, res) => {
  try {
    const success = await contractService.deleteContract(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Contract not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// --- NOVA FUNÇÃO DE EXPORTAÇÃO ---
const exportContracts = async (req, res) => {
    try {
        const userInfo = { id: req.userId, profile: req.userProfile };
        const contracts = await contractService.exportAllContracts(req.query, userInfo);

        const formattedData = contracts.map(c => ({
            'Nome do Contrato': c.name,
            'Número do Contrato': c.contractNumber,
            'Cliente': c.company ? c.company.tradeName : '',
            'Data de Início': c.startDate,
            'Data de Fim': c.endDate,
        }));
        
        const buffer = xlsxService.jsonToXlsxBuffer(formattedData);
        const filename = `contratos-${new Date().toISOString().slice(0,10)}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ error: 'Failed to export data.', details: error.message });
    }
};

module.exports = {
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  deleteContract,
  exportContracts, // Adicionado
};