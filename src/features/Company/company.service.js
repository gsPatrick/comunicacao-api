const { Company, Contract, WorkLocation } = require('../../models');
const { Op } = require('sequelize');

/**
 * Cria uma nova empresa (cliente) no banco de dados.
 * @param {object} companyData - Dados da empresa a ser criada.
 * @returns {Promise<Company>} A empresa criada.
 */
const createCompany = async (companyData) => {
  const company = await Company.create(companyData);
  return company;
};

/**
 * Busca todas as empresas com filtros e paginação.
 * @param {object} filters - Opções de filtro (tradeName, cnpj, page, limit).
 * @returns {Promise<{total: number, companies: Array<Company>, page: number, limit: number}>}
 */
const findAllCompanies = async (filters) => {
  const { tradeName, cnpj, page = 1, limit = 10 } = filters;
  const where = {};

  if (tradeName) where.tradeName = { [Op.iLike]: `%${tradeName}%` };
  if (cnpj) where.cnpj = { [Op.like]: `%${cnpj}%` };

  const offset = (page - 1) * limit;

  const { count, rows } = await Company.findAndCountAll({
    where,
    limit,
    offset,
    order: [['tradeName', 'ASC']],
  });

  return { total: count, companies: rows, page, limit };
};

/**
 * Busca uma empresa pelo seu ID, incluindo seus contratos e locais de trabalho.
 * @param {string} id - O ID da empresa.
 * @returns {Promise<Company|null>} A empresa encontrada ou nulo.
 */
const findCompanyById = async (id) => {
  const company = await Company.findByPk(id, {
    include: [{
      model: Contract,
      as: 'contracts',
      include: [{
        model: WorkLocation,
        as: 'workLocations'
      }]
    }]
  });
  return company;
};

/**
 * Atualiza os dados de uma empresa.
 * @param {string} id - O ID da empresa a ser atualizada.
 * @param {object} updateData - Os dados a serem atualizados.
 * @returns {Promise<Company|null>} A empresa atualizada ou nulo se não encontrada.
 */
const updateCompany = async (id, updateData) => {
  const company = await Company.findByPk(id);
  if (!company) {
    return null;
  }
  await company.update(updateData);
  return company;
};

/**
 * Deleta uma empresa do banco de dados.
 * @param {string} id - O ID da empresa a ser deletada.
 * @returns {Promise<boolean>} True se foi bem-sucedido, false caso contrário.
 */
const deleteCompany = async (id) => {
  const company = await Company.findByPk(id);
  if (!company) {
    return false;
  }
  await company.destroy();
  return true;
};

const findAllCompaniesForExport = async () => {
  const companies = await Company.findAll({
    order: [['tradeName', 'ASC']],
  });
  return companies;
};

module.exports = {
  createCompany,
  findAllCompanies,
  findCompanyById,
  updateCompany,
  deleteCompany,
  findAllCompaniesForExport
};