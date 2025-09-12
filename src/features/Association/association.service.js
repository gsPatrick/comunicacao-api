const { User, Company, UserCompany } = require('../../models');
const { Op } = require('sequelize');

/**
 * Vincula um usuário a uma ou mais empresas.
 * Substitui todas as associações existentes do usuário.
 * @param {string} userId - O ID do usuário.
 * @param {Array<string>} companyIds - Um array de IDs de empresas.
 * @returns {Promise<boolean>} True se a operação foi bem-sucedida.
 * @throws {Error} Se o usuário ou alguma das empresas não forem encontrados, ou se o perfil for inválido.
 */
const linkUserToCompanies = async (userId, companyIds) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found.');
  }
  // Regra de Negócio: Apenas GESTAO e SOLICITANTE podem ser vinculados a empresas.
  if (!['GESTAO', 'SOLICITANTE'].includes(user.profile)) {
    throw new Error(`User with profile ${user.profile} cannot be linked to companies.`);
  }

  const companies = await Company.findAll({ where: { id: { [Op.in]: companyIds } } });
  if (companies.length !== companyIds.length) {
    throw new Error('One or more companies not found.');
  }

  // O método `setCompanies` do Sequelize gerencia a tabela pivot (UserCompany)
  // Ele remove associações antigas e adiciona as novas.
  await user.setCompanies(companies);

  return true;
};

/**
 * Desvincula um usuário de uma empresa específica.
 * @param {string} userId - O ID do usuário.
 * @param {string} companyId - O ID da empresa.
 * @returns {Promise<boolean>} True se a desvinculação ocorreu.
 * @throws {Error} Se a associação não existir.
 */
const unlinkUserFromCompany = async (userId, companyId) => {
  const result = await UserCompany.destroy({
    where: { userId, companyId }
  });

  if (result === 0) {
    throw new Error('Association between user and company not found.');
  }
  return true;
};

/**
 * Busca todas as empresas associadas a um usuário específico.
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<Array<Company>>} Um array de empresas.
 * @throws {Error} Se o usuário não for encontrado.
 */
const findCompaniesByUser = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{
      model: Company,
      as: 'companies',
      attributes: ['id', 'tradeName', 'cnpj'],
      through: { attributes: [] } // Não inclui dados da tabela pivot
    }]
  });

  if (!user) {
    throw new Error('User not found.');
  }
  return user.companies;
};

/**
 * Busca todos os usuários associados a uma empresa específica.
 * @param {string} companyId - O ID da empresa.
 * @returns {Promise<Array<User>>} Um array de usuários (sem senhas).
 * @throws {Error} Se a empresa não for encontrada.
 */
const findUsersByCompany = async (companyId) => {
  const company = await Company.findByPk(companyId, {
    include: [{
      model: User,
      as: 'users',
      attributes: { exclude: ['password'] },
      through: { attributes: [] }
    }]
  });

  if (!company) {
    throw new Error('Company not found.');
  }
  return company.users;
};

/**
 * Busca todas as permissões disponíveis no sistema.
 */
const findAllPermissions = async () => {
  return await Permission.findAll({ order: [['key', 'ASC']] });
};

/**
 * Busca as permissões de um usuário específico.
 */
const findPermissionsByUser = async (userId) => {
  return await UserPermission.findAll({ where: { userId } });
};

/**
 * Substitui TODAS as permissões de um usuário pelas novas fornecidas.
 * @param {string} userId - ID do usuário.
 * @param {Array<object>} permissionsData - Array de objetos de permissão { permissionKey, scopeType, scopeId }.
 */
const setUserPermissions = async (userId, permissionsData) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found.');

  const transaction = await sequelize.transaction();
  try {
    // 1. Deleta todas as permissões antigas
    await UserPermission.destroy({ where: { userId }, transaction });

    // 2. Insere as novas permissões (se houver alguma)
    if (permissionsData && permissionsData.length > 0) {
      const newPermissions = permissionsData.map(p => ({
        userId,
        permissionKey: p.permissionKey,
        scopeType: p.scopeType || null,
        scopeId: p.scopeId || null,
      }));
      await UserPermission.bulkCreate(newPermissions, { transaction, validate: true });
    }
    
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  linkUserToCompanies,
  unlinkUserFromCompany,
  findCompaniesByUser,
  findUsersByCompany,
  findAllPermissions,
  findPermissionsByUser,
  setUserPermissions,
};