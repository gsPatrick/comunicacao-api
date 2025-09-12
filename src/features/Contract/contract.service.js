const { Contract, Company, WorkLocation, UserPermission, Permission } = require('../../models'); // Adicionado UserPermission e removido UserCompany
const { Op } = require('sequelize');

/**
 * Função auxiliar para obter os IDs de contrato permitidos para um usuário.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @param {string} permissionKey - A chave da permissão a ser verificada (ex: 'contracts:read').
 * @returns {Promise<Array<string>|null>} Um array de IDs de contrato ou null se o acesso for irrestrito (Admin).
 */
const getAllowedContractIds = async (userInfo, permissionKey) => {
  // Admin tem acesso a tudo, retorna null para indicar sem restrições.
  if (userInfo.profile === 'ADMIN') {
    return null;
  }

  const userPermissions = await UserPermission.findAll({
    where: {
      userId: userInfo.id,
      permissionKey: permissionKey,
      scopeType: { [Op.in]: ['COMPANY', 'CONTRACT'] }, // Aceita escopo por empresa ou contrato
    },
    attributes: ['scopeType', 'scopeId'],
  });

  // Se não houver permissões explícitas, o usuário não tem acesso a nada.
  if (userPermissions.length === 0) {
    return [];
  }

  const allowedContractIds = new Set();
  const companyScopeIds = [];

  userPermissions.forEach(p => {
    if (p.scopeType === 'CONTRACT') {
      allowedContractIds.add(p.scopeId);
    } else if (p.scopeType === 'COMPANY') {
      companyScopeIds.push(p.scopeId);
    }
  });

  // Se houver escopos de empresa, busca todos os contratos dessas empresas
  if (companyScopeIds.length > 0) {
    const contractsFromCompanies = await Contract.findAll({
      where: {
        companyId: { [Op.in]: companyScopeIds },
      },
      attributes: ['id'],
    });
    contractsFromCompanies.forEach(c => allowedContractIds.add(c.id));
  }

  return Array.from(allowedContractIds);
};

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
 * Busca todos os contratos com filtros e paginação, aplicando permissões de escopo.
 * @param {object} filters - Opções de filtro (companyId, name, page, limit).
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<{total: number, contracts: Array<Contract>, page: number, limit: number}>}
 */
const findAllContracts = async (filters, userInfo) => {
  const { companyId, name, page = 1, limit = 10, all = false } = filters;
  const where = {};
  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (companyId) where.companyId = companyId;

  // --- NOVA LÓGICA DE ESCOPO ---
  const allowedContractIds = await getAllowedContractIds(userInfo, 'contracts:read');

  // Se allowedContractIds for um array (não-admin), aplica o filtro.
  if (allowedContractIds !== null) {
    // Se o array estiver vazio, significa que o usuário não tem acesso a nenhum contrato.
    if (allowedContractIds.length === 0) {
      return { total: 0, contracts: [], page, limit: parseInt(limit, 10) };
    }
    where.id = { [Op.in]: allowedContractIds };
  }
  // --- FIM DA NOVA LÓGICA ---

  const queryOptions = {
    where,
    include: [{
      model: Company,
      as: 'company',
      attributes: ['id', 'tradeName'],
    }],
    order: [['name', 'ASC']],
  };

  if (!all) {
    queryOptions.limit = parseInt(limit, 10);
    queryOptions.offset = (parseInt(page, 10) - 1) * queryOptions.limit;
  }
  
  const { count, rows } = await Contract.findAndCountAll(queryOptions);
  return { total: count, contracts: rows, page: all ? 1 : parseInt(page, 10), limit: all ? count : parseInt(limit, 10) };
};

/**
 * Busca um contrato pelo seu ID, validando o escopo de acesso do usuário.
 * @param {string} id - O ID do contrato.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<Contract|null>} O contrato encontrado ou nulo.
 */
const findContractById = async (id, userInfo) => {
  // --- NOVA LÓGICA DE ESCOPO ---
  const allowedContractIds = await getAllowedContractIds(userInfo, 'contracts:read');

  // Se não for admin e o ID solicitado não estiver na lista de permitidos, nega o acesso.
  if (allowedContractIds !== null && !allowedContractIds.includes(id)) {
    return null; // Acesso negado
  }
  // --- FIM DA NOVA LÓGICA ---

  const contract = await Contract.findByPk(id, {
    include: [
      {
        model: Company,
        as: 'company',
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

/**
 * Busca todos os contratos para exportação, aplicando permissões de escopo.
 * @param {object} filters - Opções de filtro (companyId, name).
 * @param {object} userInfo - Informações do usuário logado.
 * @returns {Promise<Array<Contract>>}
 */
const exportAllContracts = async (filters, userInfo) => {
  const { companyId, name } = filters;
  const where = {};
  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (companyId) where.companyId = companyId;

  // --- NOVA LÓGICA DE ESCOPO ---
  const allowedContractIds = await getAllowedContractIds(userInfo, 'contracts:read');

  if (allowedContractIds !== null) {
    if (allowedContractIds.length === 0) {
      return []; // Retorna vazio se não tiver acesso
    }
    where.id = { [Op.in]: allowedContractIds };
  }
  // --- FIM DA NOVA LÓGICA ---
  
  const contracts = await Contract.findAll({
    where,
    include: [{ model: Company, as: 'company', attributes: ['id', 'tradeName'] }],
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