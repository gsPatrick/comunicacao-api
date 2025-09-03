const { WorkLocation, Contract } = require('../../models');
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
 * Busca todos os locais de trabalho com filtros (por contractId) e paginação.
 * @param {object} filters - Opções de filtro (contractId, name, page, limit).
 * @returns {Promise<{total: number, workLocations: Array<WorkLocation>, page: number, limit: number}>}
 */
const findAllWorkLocations = async (filters) => {
  const { contractId, name, page = 1, limit = 10 } = filters;
  const where = {};

  if (contractId) where.contractId = contractId;
  if (name) where.name = { [Op.iLike]: `%${name}%` };

  const offset = (page - 1) * limit;

  const { count, rows } = await WorkLocation.findAndCountAll({
    where,
    include: [{ model: Contract, as: 'contract', attributes: ['id', 'name'] }],
    limit,
    offset,
    order: [['name', 'ASC']],
  });

  return { total: count, workLocations: rows, page, limit };
};

/**
 * Busca um local de trabalho pelo seu ID.
 * @param {string} id - O ID do local.
 * @returns {Promise<WorkLocation|null>} O local de trabalho encontrado ou nulo.
 */
const findWorkLocationById = async (id) => {
  const workLocation = await WorkLocation.findByPk(id, {
    include: [{ model: Contract, as: 'contract' }]
  });
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

module.exports = {
  createWorkLocation,
  findAllWorkLocations,
  findWorkLocationById,
  updateWorkLocation,
  deleteWorkLocation,
};