const companyService = require('./company.service');

const createCompany = async (req, res) => {
  try {
    const company = await companyService.createCompany(req.body);
    return res.status(201).json(company);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'CNPJ already registered.' });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getAllCompanies = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile }; // Coleta userInfo
    const companiesData = await companyService.findAllCompanies(req.query, userInfo); // Passa userInfo
    return res.status(200).json(companiesData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getCompanyById = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile }; // Coleta userInfo
    const company = await companyService.findCompanyById(req.params.id, userInfo); // Passa userInfo
    if (!company) {
      return res.status(404).json({ error: 'Company not found or access denied.' }); // Mensagem ajustada
    }
    return res.status(200).json(company);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const updateCompany = async (req, res) => {
  try {
    const updatedCompany = await companyService.updateCompany(req.params.id, req.body);
    if (!updatedCompany) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    return res.status(200).json(updatedCompany);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'CNPJ already registered.' });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const deleteCompany = async (req, res) => {
  try {
    const success = await companyService.deleteCompany(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const exportCompanies = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile }; // Coleta userInfo
    const allCompanies = await companyService.findAllCompaniesForExport(req.query, userInfo); // Passa userInfo
    
    // Define os headers para forçar o download do arquivo
    res.setHeader('Content-disposition', 'attachment; filename=companies.json');
    res.set('Content-Type', 'application/json');
    
    // Retorna os dados em formato JSON
    return res.status(200).json(allCompanies);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

module.exports = {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  exportCompanies
};