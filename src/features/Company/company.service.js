const { Company, Contract, WorkLocation, UserPermission } = require('../../models'); // UserCompany não é mais necessário aqui. Adicionado UserPermission.
const { Op } = require('sequelize');

/**
 * Cria uma nova empresa (cliente) no banco de dados.
 * A permissão para esta ação é verificada na rota.
 * @param {object} companyData - Dados da empresa a ser criada.
 * @returns {Promise<Company>} A empresa criada.
 */
const createCompany = async (companyData) => {
  const company = await Company.create(companyData);
  return company;
};

/**
 * Busca todas as empresas com filtros e paginação, aplicando o escopo de permissão do usuário.
 * @param {object} filters - Opções de filtro (tradeName, cnpj, page, limit).
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<{total: number, companies: Array<Company>, page: number, limit: number}>}
 */
const findAllCompanies = async (filters, userInfo) => {
  const { tradeName, cnpj, page = 1, limit = 10, all = false } = filters;
  const where = {};
  if (tradeName) where.tradeName = { [Op.iLike]: `%${tradeName}%` };
  if (cnpj) where.cnpj = { [Op.like]: `%${cnpj}%` };

  // --- NOVA LÓGICA DE ESCOPO ---
  // Se o usuário não for ADMIN, filtramos as empresas com base em suas permissões explícitas.
  if (userInfo && userInfo.profile !== 'ADMIN') {
    const userPermissions = await UserPermission.findAll({
      where: {
        userId: userInfo.id,
        permissionKey: 'companies:read', // Permissão necessária para esta ação
        scopeType: 'COMPANY', // O escopo deve ser de empresa
      },
      attributes: ['scopeId'] // Apenas nos interessa o ID da empresa permitida
    });

    const allowedCompanyIds = userPermissions.map(p => p.scopeId);

    // Se o usuário não tem escopos definidos para esta permissão, ele não pode ver nenhuma empresa.
    if (allowedCompanyIds.length === 0) {
      return { total: 0, companies: [], page: all ? 1 : parseInt(page, 10), limit: all ? 0 : parseInt(limit, 10) };
    }
    
    // Adiciona o filtro de escopo à cláusula 'where' principal.
    where.id = { [Op.in]: allowedCompanyIds };
  }
  // --- FIM DA NOVA LÓGICA ---

  const queryOptions = {
    where,
    order: [['tradeName', 'ASC']],
  };

  if (!all) {
    queryOptions.limit = parseInt(limit, 10);
    queryOptions.offset = (parseInt(page, 10) - 1) * queryOptions.limit;
  }

  const { count, rows } = await Company.findAndCountAll(queryOptions);
  return { total: count, companies: rows, page: all ? 1 : parseInt(page, 10), limit: all ? count : parseInt(limit, 10) };
};

/**
 * Busca uma empresa pelo seu ID, validando se o usuário tem permissão para acessá-la.
 * @param {string} id - O ID da empresa.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<Company|null>} A empresa encontrada ou nulo.
 */
const findCompanyById = async (id, userInfo) => {
  // --- NOVA LÓGICA DE ESCOPO ---
  if (userInfo && userInfo.profile !== 'ADMIN') {
    const hasPermissionForThisCompany = await UserPermission.findOne({
      where: {
        userId: userInfo.id,
        permissionKey: 'companies:read',
        scopeType: 'COMPANY',
        scopeId: id // Verifica permissão especificamente para este ID de empresa
      }
    });

    // Se não houver uma permissão explícita para este ID, o acesso é negado.
    if (!hasPermissionForThisCompany) {
      return null;
    }
  }
  // --- FIM DA NOVA LÓGICA ---

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

/**
 * Busca todas as empresas para exportação, aplicando o escopo de permissão do usuário.
 * @param {object} filters - Opções de filtro (tradeName, cnpj).
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<Array<Company>>} Um array com todas as empresas encontradas.
 */
const findAllCompaniesForExport = async (filters, userInfo) => {
  const { tradeName, cnpj } = filters;
  const where = {};

  if (tradeName) where.tradeName = { [Op.iLike]: `%${tradeName}%` };
  if (cnpj) where.cnpj = { [Op.like]: `%${cnpj}%` };

  // --- NOVA LÓGICA DE ESCOPO (Idêntica à de findAllCompanies) ---
  if (userInfo && userInfo.profile !== 'ADMIN') {
    const userPermissions = await UserPermission.findAll({
      where: {
        userId: userInfo.id,
        permissionKey: 'companies:read',
        scopeType: 'COMPANY',
      },
      attributes: ['scopeId']
    });

    const allowedCompanyIds = userPermissions.map(p => p.scopeId);
    
    if (allowedCompanyIds.length === 0) {
      return []; // Retorna um array vazio se não houver escopos
    }

    where.id = { [Op.in]: allowedCompanyIds };
  }
  // --- FIM DA NOVA LÓGICA ---

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