const { Contract, Company, WorkLocation } = require('../../models');
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
 * @returns {Promise<{total: number, contracts: Array<Contract>, page: number, limit: number}>}
 */
const findAllContracts = async (filters) => {
  const { companyId, name, page = 1, limit = 10 } = filters;
  const where = {};

  if (companyId) where.companyId = companyId;
  if (name) where.name = { [Op.iLike]: `%${name}%` };

  const offset = (page - 1) * limit;

  const { count, rows } = await Contract.findAndCountAll({
    where,
    include: [{ model: Company, as: 'company', attributes: ['id', 'tradeName'] }],
    limit,
    offset,
    order: [['name', 'ASC']],
  });

  return { total: count, contracts: rows, page, limit };
};

/**
 * Busca um contrato pelo seu ID, incluindo a empresa e seus locais de trabalho.
 * @param {string} id - O ID do contrato.
 * @returns {Promise<Contract|null>} O contrato encontrado ou nulo.
 */
const findContractById = async (id) => {
  const contract = await Contract.findByPk(id, {
    include: [
      { model: Company, as: 'company' },
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

module.exports = {
  createContract,
  findAllContracts,
  findContractById,
  updateContract,
  deleteContract,
};