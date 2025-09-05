const associationService = require('./association.service');

const linkUserToCompanies = async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyIds } = req.body;
    if (!companyIds || !Array.isArray(companyIds)) {
      return res.status(400).json({ error: 'companyIds must be an array.' });
    }
    await associationService.linkUserToCompanies(userId, companyIds);
    return res.status(200).json({ message: 'User linked to companies successfully.' });
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
};

const unlinkUserFromCompany = async (req, res) => {
  try {
    const { userId, companyId } = req.params;
    await associationService.unlinkUserFromCompany(userId, companyId);
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
};

const getCompaniesByUser = async (req, res) => {
  try {
    // --- VERIFICAÇÃO DE PERMISSÃO ADICIONADA ---
    // Um usuário não-admin só pode consultar suas próprias associações.
    if (req.userProfile !== 'ADMIN' && req.userId !== req.params.userId) {
        return res.status(403).json({ error: 'Access denied. You can only view your own associations.' });
    }

    const { userId } = req.params;
    const companies = await associationService.findCompaniesByUser(userId);
    return res.status(200).json(companies);
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
};

const getUsersByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const users = await associationService.findUsersByCompany(companyId);
    return res.status(200).json(users);
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
};

module.exports = {
  linkUserToCompanies,
  unlinkUserFromCompany,
  getCompaniesByUser,
  getUsersByCompany
};