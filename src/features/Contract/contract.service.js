const { Contract, Company, WorkLocation, UserCompany } = require('../../models'); // Adicionado UserCompany
const { Op } = require('sequelize');

/**
 * Cria um novo contrato, garantindo que a empresa associada exista.
 * @param {object} contractData - Dados do contrato, incluindo companyId.
 * @returns {Promise<Contract>} O contrato criado.
 * @throws {Error} Se a empresa (companyId) não for encontrada.
 */
const createContract = async (contractData) => {
  const company = await Company.findByPk(contractData.companyId);
  if (!company) {
    throw new Error('Company not found.');
  }
  const contract = await Contract.create(contractData);
  return contract;
};

/**
 * Busca todos os contratos com filtros (especialmente por companyId) e paginação.
 * @param {object} filters - Opções de filtro (companyId, name, page, limit).
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<{total: number, contracts: Array<Contract>, page: number, limit: number}>}
 */
const findAllContracts = async (filters, userInfo) => {
  const { companyId, name, page = 1, limit = 10, all = false } = filters;
  const where = {};
  const companyWhere = {};
  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (companyId) where.companyId = companyId;

  if (userInfo && userInfo.profile === 'GESTAO') {
    const userCompanies = await UserCompany.findAll({ where: { userId: userInfo.id }, attributes: ['companyId'] });
    const allowedCompanyIds = userCompanies.map(uc => uc.companyId);
    companyWhere.id = { [Op.in]: allowedCompanyIds };
  }

  const queryOptions = {
    where,
    include: [{
      model: Company,
      as: 'company',
      attributes: ['id', 'tradeName'],
      where: companyWhere,
      required: !!(Object.keys(companyWhere).length > 0)
    }],
    order: [['name', 'ASC']],
  };

  if (!all) {
    queryOptions.limit = parseInt(limit, 10);
    queryOptions.offset = (parseInt(page, 10) - 1) * queryOptions.limit;
  }
  
  const { count, rows } = await Contract.findAndCountAll(queryOptions);
  return { total: count, contracts: rows, page: all ? 1 : page, limit: all ? count : limit };
};

/**
 * Busca um contrato pelo seu ID, incluindo a empresa e seus locais de trabalho.
 * @param {string} id - O ID do contrato.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<Contract|null>} O contrato encontrado ou nulo.
 */
const findContractById = async (id, userInfo) => {
  const companyWhere = {}; // Novo objeto where para a Company

  // Lógica de permissão para GESTAO
  if (userInfo && userInfo.profile === 'GESTAO') {
    const userCompanies = await UserCompany.findAll({
      where: { userId: userInfo.id },
      attributes: ['companyId']
    });
    const allowedCompanyIds = userCompanies.map(uc => uc.companyId);
    companyWhere.id = { [Op.in]: allowedCompanyIds }; // Filtra as empresas pelas quais o gestor é responsável
  }

  const contract = await Contract.findByPk(id, {
    include: [
      {
        model: Company,
        as: 'company',
        where: companyWhere, // Aplica o filtro da empresa aqui
        required: !!(Object.keys(companyWhere).length > 0) // Força o JOIN se houver filtro de empresa
      },
      { model: WorkLocation, as: 'workLocations' }
    ]
  });
  return contract;
};

/**
 * Atualiza os dados de um contrato.
 * @param {string} id - O ID do contrato a ser atualizado.
 * @param {object} updateData - Os dados a serem atualizados.
 * @returns {Promise<Contract|null>} O contrato atualizado ou nulo.
 */
const updateContract = async (id, updateData) => {
  const contract = await Contract.findByPk(id);
  if (!contract) {
    return null;
  }
  await contract.update(updateData);
  return contract;
};

/**
 * Deleta um contrato.
 * @param {string} id - O ID do contrato a ser deletado.
 * @returns {Promise<boolean>} True se foi bem-sucedido, false caso contrário.
 */
const deleteContract = async (id) => {
  const contract = await Contract.findByPk(id);
  if (!contract) {
    return false;
  }
  await contract.destroy();
  return true;
};

// --- NOVA FUNÇÃO DE EXPORTAÇÃO ---
const exportAllContracts = async (filters, userInfo) => {
  const { companyId, name } = filters;
  const where = {};
  const companyWhere = {};
  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (companyId) where.companyId = companyId;
  if (userInfo && userInfo.profile === 'GESTAO') {
    const userCompanies = await UserCompany.findAll({ where: { userId: userInfo.id }, attributes: ['companyId'] });
    const allowedCompanyIds = userCompanies.map(uc => uc.companyId);
    companyWhere.id = { [Op.in]: allowedCompanyIds };
  }
  const contracts = await Contract.findAll({
    where,
    include: [{ model: Company, as: 'company', attributes: ['id', 'tradeName'], where: companyWhere, required: !!(Object.keys(companyWhere).length > 0) }],
    order: [['name', 'ASC']],
  });
  return contracts;
};

module.exports = {
  createContract,
  findAllContracts,
  findContractById,
  updateContract,
  deleteContract,
  exportAllContracts
};