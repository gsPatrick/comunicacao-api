const { Company, Contract, WorkLocation, UserCompany } = require('../../models'); // Adicionado UserCompany
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
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<{total: number, companies: Array<Company>, page: number, limit: number}>}
 */
const findAllCompanies = async (filters, userInfo) => {
  const { tradeName, cnpj, page = 1, limit = 10, all = false } = filters; // Adicionado 'all'
  const where = {};
  if (tradeName) where.tradeName = { [Op.iLike]: `%${tradeName}%` };
  if (cnpj) where.cnpj = { [Op.like]: `%${cnpj}%` };

  if (userInfo && userInfo.profile === 'GESTAO') {
    const userCompanies = await UserCompany.findAll({ where: { userId: userInfo.id }, attributes: ['companyId'] });
    const companyIds = userCompanies.map(uc => uc.companyId);
    where.id = { [Op.in]: companyIds };
  }

  const queryOptions = {
    where,
    order: [['tradeName', 'ASC']],
  };

  // Se 'all' não for true, aplica paginação
  if (!all) {
    queryOptions.limit = parseInt(limit, 10);
    queryOptions.offset = (parseInt(page, 10) - 1) * queryOptions.limit;
  }

  const { count, rows } = await Company.findAndCountAll(queryOptions);
  return { total: count, companies: rows, page: all ? 1 : page, limit: all ? count : limit };
};

/**
 * Busca uma empresa pelo seu ID, incluindo seus contratos e locais de trabalho.
 * @param {string} id - O ID da empresa.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<Company|null>} A empresa encontrada ou nulo.
 */
const findCompanyById = async (id, userInfo) => {
  const where = { id };

  // Lógica de permissão para GESTAO
  if (userInfo && userInfo.profile === 'GESTAO') {
    const userCompanies = await UserCompany.findAll({
      where: { userId: userInfo.id },
      attributes: ['companyId']
    });
    const companyIds = userCompanies.map(uc => uc.companyId);
    if (!companyIds.includes(id)) { // Se o gestor não está associado a esta empresa, retorna null
      return null;
    }
    // O filtro where.id já garante que ele verá apenas a empresa que ele pediu por ID.
    // A validação acima é uma checagem extra de segurança.
  }

  const company = await Company.findByPk(id, {
    where, // Adicionando o 'where' para o caso de GESTAO, embora findByPk já filtre por id
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

/**
 * Busca todas as empresas para exportação, sem paginação.
 * @param {object} filters - Opções de filtro (tradeName, cnpj).
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<Array<Company>>} Um array com todas as empresas encontradas.
 */
const findAllCompaniesForExport = async (filters, userInfo) => {
  const { tradeName, cnpj } = filters;
  const where = {};

  if (tradeName) where.tradeName = { [Op.iLike]: `%${tradeName}%` };
  if (cnpj) where.cnpj = { [Op.like]: `%${cnpj}%` };

  // Lógica de permissão para GESTAO
  if (userInfo && userInfo.profile === 'GESTAO') {
    const userCompanies = await UserCompany.findAll({
      where: { userId: userInfo.id },
      attributes: ['companyId']
    });
    const companyIds = userCompanies.map(uc => uc.companyId);
    where.id = { [Op.in]: companyIds }; // Filtra as empresas pelas quais o gestor é responsável
  }

  const companies = await Company.findAll({
    where,
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