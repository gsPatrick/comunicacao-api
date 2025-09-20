const { User } = require('../../models');
const { Op } = require('sequelize');
const emailService = require('../Email/email.service');

/**
 * Cria um novo usuário no banco de dados.
 * @param {object} userData - Dados do usuário a ser criado.
 * @returns {Promise<User>} O usuário criado (sem a senha).
 */
const createUser = async (userData) => {
  const user = await User.create(userData);
  if (user && userData.password) {
    try {
      await emailService.sendWelcomeEmail(user, userData.password);
    } catch (emailError) {
      console.error(`Falha ao enfileirar e-mail de boas-vindas para ${user.email}, mas o usuário foi criado.`);
    }
  }
  user.password = undefined;
  return user;
};

/**
 * Busca todos os usuários com opção de filtro e paginação.
 * @param {object} filters - Opções de filtro (name, email, profile, isActive).
 * @returns {Promise<Array<User>>} Uma lista de usuários.
 */
const findAllUsers = async (filters) => {
  const { name, email, profile, isActive, page = 1, limit = 10 } = filters;
  const where = {};

  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (email) where.email = { [Op.iLike]: `%${email}%` };
  if (profile) where.profile = profile;
  if (isActive !== undefined) where.isActive = isActive;

  const offset = (page - 1) * limit;

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    limit,
    offset,
    order: [['name', 'ASC']],
  });

  return { total: count, users: rows, page, limit };
};

/**
 * Busca um usuário pelo seu ID.
 * @param {string} id - O ID do usuário.
 * @returns {Promise<User|null>} O usuário encontrado ou nulo.
 */
const findUserById = async (id) => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password'] },
  });
  return user;
};

/**
 * Atualiza os dados de um usuário.
 * @param {string} id - O ID do usuário a ser atualizado.
 * @param {object} updateData - Os dados a serem atualizados.
 * @returns {Promise<User|null>} O usuário atualizado ou nulo se não encontrado.
 */
const updateUser = async (id, updateData) => {
  const user = await User.findByPk(id);
  if (!user) {
    return null;
  }
  if (updateData.password === null || updateData.password === undefined || updateData.password === '') {
    delete updateData.password;
  }
  await user.update(updateData);
  user.password = undefined;
  return user;
};

/**
 * "Deleta" um usuário (soft delete, definindo isActive como false).
 * @param {string} id - O ID do usuário a ser desativado.
 * @returns {Promise<boolean>} True se foi bem-sucedido, false caso contrário.
 */
const softDeleteUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    return false;
  }
  await user.update({ isActive: false });
  return true;
};

/**
 * Exclui permanentemente um usuário do banco de dados. AÇÃO IRREVERSÍVEL.
 * @param {string} id - O ID do usuário a ser excluído.
 * @returns {Promise<boolean>} True se foi bem-sucedido, false se o usuário não foi encontrado.
 */
const hardDeleteUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    return false;
  }
  await user.destroy(); // Isso remove a linha do banco de dados
  return true;
};

/**
 * Busca TODOS os usuários que correspondem aos filtros, sem paginação, para exportação.
 * @param {object} filters - Opções de filtro (name, email, profile, isActive).
 * @returns {Promise<Array<User>>} Um array com todos os usuários encontrados.
 */
const exportAllUsers = async (filters) => {
  const { name, email, profile, isActive } = filters;
  const where = {};

  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (email) where.email = { [Op.iLike]: `%${email}%` };
  if (profile) where.profile = profile;
  if (isActive !== undefined) where.isActive = isActive;

  const users = await User.findAll({
    where,
    attributes: { exclude: ['password'] },
    order: [['name', 'ASC']],
  });

  return users;
};

module.exports = {
  createUser,
  findAllUsers,
  findUserById,
  updateUser,
  softDeleteUser,
  hardDeleteUser,
  exportAllUsers
};