const { WorkLocation, Contract, Company, UserPermission } = require('../../models'); // Adicionado UserPermission
const { Op } = require('sequelize');

/**
 * Cria um novo local de trabalho, garantindo que o contrato associado exista.
 * @param {object} locationData - Dados do local, incluindo contractId.
 * @returns {Promise<WorkLocation>} O local de trabalho criado.
 * @throws {Error} Se o contrato (contractId) não for encontrado.
 */
const createWorkLocation = async (locationData) => {
  const contract = await Contract.findByPk(locationData.contractId);
  if (!contract) {
    throw new Error('Contract not found.');
  }
  const workLocation = await WorkLocation.create(locationData);
  return workLocation;
};

/**
 * Busca todos os locais de trabalho com filtros e paginação, aplicando permissões de escopo.
 * @param {object} filters - Opções de filtro (contractId, name, page, limit).
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<{total: number, workLocations: Array<WorkLocation>, page: number, limit: number}>}
 */
const findAllWorkLocations = async (filters, userInfo) => {
  const { contractId, name, page = 1, limit = 10, all = false } = filters;
  const where = {};
  const companyWhere = {};
  if (contractId) where.contractId = contractId;
  if (name) where.name = { [Op.iLike]: `%${name}%` };

  // --- NOVA LÓGICA DE ESCOPO DE PERMISSÃO ---
  // Se o usuário não é Admin, buscamos os escopos de empresa aos quais ele tem acesso.
  if (userInfo && userInfo.profile !== 'ADMIN') {
    const permissions = await UserPermission.findAll({
      where: {
        userId: userInfo.id,
        permissionKey: 'work-locations:read', // Permissão necessária para esta ação
        scopeType: 'COMPANY', // O escopo é definido por Empresa
      },
      attributes: ['scopeId'],
    });

    const allowedCompanyIds = permissions.map(p => p.scopeId);

    // Se o usuário não tem permissão para nenhuma empresa, ele não pode ver nenhum local.
    if (allowedCompanyIds.length === 0) {
      return { total: 0, workLocations: [], page: parseInt(page, 10), limit: parseInt(limit, 10) };
    }

    companyWhere.id = { [Op.in]: allowedCompanyIds };
  }
  // --- FIM DA NOVA LÓGICA ---

  const queryOptions = {
    where,
    include: [{
      model: Contract,
      as: 'contract',
      required: true, // Garante que locais sem contrato não sejam listados
      include: [{
        model: Company,
        as: 'company',
        where: companyWhere, // Aplica o filtro de escopo aqui
        required: true, // Garante que o filtro seja aplicado (INNER JOIN)
      }],
    }],
    order: [['name', 'ASC']],
  };

  if (!all) {
    queryOptions.limit = parseInt(limit, 10);
    queryOptions.offset = (parseInt(page, 10) - 1) * queryOptions.limit;
  }
  
  const { count, rows } = await WorkLocation.findAndCountAll(queryOptions);
  return { total: count, workLocations: rows, page: all ? 1 : parseInt(page, 10), limit: all ? count : parseInt(limit, 10) };
};


/**
 * Busca um local de trabalho pelo seu ID, validando o escopo de permissão.
 * @param {string} id - O ID do local.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<WorkLocation|null>} O local de trabalho encontrado ou nulo se não existir ou o acesso for negado.
 */
const findWorkLocationById = async (id, userInfo) => {
  const queryOptions = {
    include: [{
      model: Contract,
      as: 'contract',
      required: true,
      include: [{
        model: Company,
        as: 'company',
        required: true,
      }],
    }]
  };

  // --- NOVA LÓGICA DE ESCOPO DE PERMISSÃO ---
  if (userInfo && userInfo.profile !== 'ADMIN') {
    const permissions = await UserPermission.findAll({
      where: {
        userId: userInfo.id,
        permissionKey: 'work-locations:read',
        scopeType: 'COMPANY',
      },
      attributes: ['scopeId'],
    });
    
    const allowedCompanyIds = permissions.map(p => p.scopeId);

    // Adiciona o filtro diretamente na consulta para garantir que o usuário só possa
    // buscar por ID locais de trabalho dentro do seu escopo de permissão.
    queryOptions.include[0].include[0].where = {
      id: { [Op.in]: allowedCompanyIds },
    };
  }
  // --- FIM DA NOVA LÓGICA ---

  // O findByPk, combinado com os joins e a cláusula 'where' interna, retornará nulo
  // se o local não for encontrado OU se ele não pertencer a uma empresa permitida.
  const workLocation = await WorkLocation.findByPk(id, queryOptions);
  return workLocation;
};

/**
 * Atualiza os dados de um local de trabalho.
 * @param {string} id - O ID do local.
 * @param {object} updateData - Os dados a serem atualizados.
 * @returns {Promise<WorkLocation|null>} O local de trabalho atualizado ou nulo.
 */
const updateWorkLocation = async (id, updateData) => {
  const workLocation = await WorkLocation.findByPk(id);
  if (!workLocation) {
    return null;
  }
  await workLocation.update(updateData);
  return workLocation;
};

/**
 * Deleta um local de trabalho.
 * @param {string} id - O ID do local.
 * @returns {Promise<boolean>} True se foi bem-sucedido, false caso contrário.
 */
const deleteWorkLocation = async (id) => {
  const workLocation = await WorkLocation.findByPk(id);
  if (!workLocation) {
    return false;
  }
  await workLocation.destroy();
  return true;
};

/**
 * Exporta todos os locais de trabalho, aplicando o escopo de permissão do usuário.
 * @param {object} filters - Filtros da requisição.
 * @param {object} userInfo - Informações do usuário logado.
 * @returns {Promise<Array<WorkLocation>>} Uma lista de locais de trabalho.
 */
const exportAllWorkLocations = async (filters, userInfo) => {
    const { contractId, name } = filters;
    const where = {};
    const companyWhere = {};
    if (contractId) where.contractId = contractId;
    if (name) where.name = { [Op.iLike]: `%${name}%` };

    // --- NOVA LÓGICA DE ESCOPO DE PERMISSÃO ---
    if (userInfo && userInfo.profile !== 'ADMIN') {
        const permissions = await UserPermission.findAll({
            where: {
                userId: userInfo.id,
                permissionKey: 'work-locations:read',
                scopeType: 'COMPANY',
            },
            attributes: ['scopeId'],
        });
        const allowedCompanyIds = permissions.map(p => p.scopeId);
        
        if (allowedCompanyIds.length === 0) {
            return []; // Retorna array vazio se não tiver acesso a nenhuma empresa
        }
        companyWhere.id = { [Op.in]: allowedCompanyIds };
    }
    // --- FIM DA NOVA LÓGICA ---

    const workLocations = await WorkLocation.findAll({
        where,
        include: [{
            model: Contract, as: 'contract', attributes: ['id', 'name'],
            required: true,
            include: [{ 
              model: Company, as: 'company', 
              where: companyWhere,
              required: true
            }],
        }],
        order: [['name', 'ASC']],
    });
    return workLocations;
};

module.exports = {
  createWorkLocation,
  findAllWorkLocations,
  findWorkLocationById,
  updateWorkLocation,
  deleteWorkLocation,
  exportAllWorkLocations
};