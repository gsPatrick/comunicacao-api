const { Position, Company, CompanyPosition } = require('../../models');
const { Op } = require('sequelize');

/**
 * Cria um novo cargo no sistema.
 * @param {object} positionData - Dados do cargo (name, description).
 * @returns {Promise<Position>} O cargo criado.
 */
const createPosition = async (positionData) => {
  const position = await Position.create(positionData);
  return position;
};

/**
 * Busca todos os cargos com filtros e paginação.
 * @param {object} filters - Opções de filtro (name, page, limit).
 * @returns {Promise<{total: number, positions: Array<Position>, page: number, limit: number}>}
 */
const findAllPositions = async (filters) => {
  const { name, page = 1, limit = 10, all = false } = filters;
  const where = {};
  if (name) where.name = { [Op.iLike]: `%${name}%` };

  const queryOptions = {
    where,
    order: [['name', 'ASC']],
    distinct: true,
    include: [{
      model: Company,
      as: 'companies',
      attributes: ['id', 'tradeName'],
      through: { attributes: [] }
    }]
  };

  if (!all) {
    queryOptions.limit = parseInt(limit, 10);
    queryOptions.offset = (parseInt(page, 10) - 1) * queryOptions.limit;
  }

  const { count, rows } = await Position.findAndCountAll(queryOptions);
  return { total: count, positions: rows, page: all ? 1 : page, limit: all ? count : limit };
};

/**
 * Busca um cargo pelo seu ID, incluindo as empresas associadas.
 * @param {string} id - O ID do cargo.
 * @returns {Promise<Position|null>} O cargo encontrado ou nulo.
 */
const findPositionById = async (id) => {
  const position = await Position.findByPk(id, {
    include: [{
      model: Company,
      as: 'companies',
      attributes: ['id', 'tradeName'],
      through: { attributes: [] }
    }]
  });
  return position;
};

/**
 * Atualiza os dados de um cargo.
 * @param {string} id - O ID do cargo.
 * @param {object} updateData - Os dados a serem atualizados.
 * @returns {Promise<Position|null>} O cargo atualizado ou nulo.
 */
const updatePosition = async (id, updateData) => {
  const position = await Position.findByPk(id);
  if (!position) {
    return null;
  }
  await position.update(updateData);
  return position;
};

/**
 * Deleta um cargo.
 * @param {string} id - O ID do cargo.
 * @returns {Promise<boolean>} True se foi bem-sucedido, false caso contrário.
 */
const deletePosition = async (id) => {
  const position = await Position.findByPk(id);
  if (!position) {
    return false;
  }
  await position.destroy();
  return true;
};

/**
 * Vincula um cargo a uma ou mais empresas.
 * @param {string} positionId - O ID do cargo.
 * @param {Array<string>} companyIds - Um array de IDs de empresas.
 * @returns {Promise<boolean>} True se a operação foi bem-sucedida.
 * @throws {Error} Se o cargo ou alguma das empresas não forem encontrados.
 */
const linkPositionToCompanies = async (positionId, companyIds) => {
  const position = await Position.findByPk(positionId);
  if (!position) {
    throw new Error('Position not found.');
  }

  const companies = await Company.findAll({ where: { id: { [Op.in]: companyIds } } });
  if (companies.length !== companyIds.length) {
    throw new Error('One or more companies not found.');
  }
  
  // O método `setCompanies` do Sequelize substitui todas as associações existentes.
  await position.setCompanies(companies);

  return true;
};

/**
 * Desvincula um cargo de uma empresa específica.
 * @param {string} positionId - O ID do cargo.
 * @param {string} companyId - O ID da empresa.
 * @returns {Promise<boolean>} True se a desvinculação ocorreu.
 * @throws {Error} Se a associação não existir.
 */
const unlinkPositionFromCompany = async (positionId, companyId) => {
    const result = await CompanyPosition.destroy({
        where: {
            positionId,
            companyId
        }
    });

    if (result === 0) {
        throw new Error('Association between position and company not found.');
    }

    return true;
};

module.exports = {
  createPosition,
  findAllPositions,
  findPositionById,
  updatePosition,
  deletePosition,
  linkPositionToCompanies,
  unlinkPositionFromCompany
};