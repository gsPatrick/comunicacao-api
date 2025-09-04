const contractService = require('./contract.service');

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
    const userInfo = { id: req.userId, profile: req.userProfile }; // Coleta userInfo
    const contractsData = await contractService.findAllContracts(req.query, userInfo); // Passa userInfo
    return res.status(200).json(contractsData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getContractById = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile }; // Coleta userInfo
    const contract = await contractService.findContractById(req.params.id, userInfo); // Passa userInfo
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found or access denied.' }); // Mensagem ajustada
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

module.exports = {
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  deleteContract,
};