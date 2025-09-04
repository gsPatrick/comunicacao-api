const { Step, WorkflowStep } = require('../../models');
const { Op } = require('sequelize');

/**
 * Cria uma nova etapa no sistema.
 * @param {object} stepData - Dados da etapa (name, description, defaultProfile).
 * @returns {Promise<Step>} A etapa criada.
 */
const createStep = async (stepData) => {
  const step = await Step.create(stepData);
  return step;
};

/**
 * Busca todas as etapas com filtros e paginação.
 * @param {object} filters - Opções de filtro (name, defaultProfile, page, limit).
 * @returns {Promise<{total: number, steps: Array<Step>, page: number, limit: number}>}
 */
const findAllSteps = async (filters) => {
  const { name, defaultProfile, page = 1, limit = 10 } = filters;
  const where = {};

  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (defaultProfile) where.defaultProfile = defaultProfile;

  const offset = (page - 1) * limit;

  const { count, rows } = await Step.findAndCountAll({
    where,
    limit,
    offset,
    order: [['name', 'ASC']],
  });

  return { total: count, steps: rows, page, limit };
};

/**
 * Busca uma etapa pelo seu ID.
 * @param {string} id - O ID da etapa.
 * @returns {Promise<Step|null>} A etapa encontrada ou nulo.
 */
const findStepById = async (id) => {
  const step = await Step.findByPk(id);
  return step;
};

/**
 * Atualiza os dados de uma etapa.
 * @param {string} id - O ID da etapa.
 * @param {object} updateData - Os dados a serem atualizados.
 * @returns {Promise<Step|null>} A etapa atualizada ou nulo.
 */
const updateStep = async (id, updateData) => {
  const step = await Step.findByPk(id);
  if (!step) {
    return null;
  }
  await step.update(updateData);
  return step;
};

/**
 * Deleta uma etapa do banco de dados.
 * @param {string} id - O ID da etapa a ser deletada.
 * @returns {Promise<boolean>} True se foi bem-sucedido, false caso contrário.
 */
const deleteStep = async (id) => {
  const step = await Step.findByPk(id);
  if (!step) {
    return false;
  }
  // Antes de deletar a Step, é importante verificar se ela está sendo usada em algum WorkflowStep.
  // Se estiver, a exclusão direta pode causar erros de chave estrangeira.
  // Uma abordagem é impedir a exclusão, ou fazer um soft delete se o modelo suportar.
  // Por ora, vamos permitir o delete e deixar o DB lançar erro de FK se houver uso.
  await step.destroy();
  return true;
};

module.exports = {
  createStep,
  findAllSteps,
  findStepById,
  updateStep,
  deleteStep,
};