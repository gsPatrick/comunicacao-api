'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, UserPermission } = require('../../models'); // Adicionado UserPermission

/**
 * Autentica um usuário, busca suas permissões granulares e gera um token JWT.
 * O token agora conterá um array com todas as chaves de permissão do usuário.
 *
 * @param {string} email - O email do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<{user: object, token: string}>} Um objeto com os dados do usuário e o token.
 * @throws {Error} Lança um erro se as credenciais forem inválidas ou o usuário estiver inativo.
 */
const login = async (email, password) => {
  // 1. Encontrar o usuário pelo email
  const user = await User.findOne({ where: { email } });
  
  if (!user) {
    throw new Error('Invalid credentials'); // Erro genérico para segurança
  }

  // 2. Verificar se o usuário está ativo
  if (!user.isActive) {
    throw new Error('User is not active');
  }

  // 3. Comparar a senha fornecida com a senha hasheada no banco
  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    throw new Error('Invalid credentials');
  }

  // --- NOVA LÓGICA: Buscar todas as permissões do usuário ---
  const userPermissions = await UserPermission.findAll({
    where: { userId: user.id },
    attributes: ['permissionKey'], // Queremos apenas a lista de chaves
  });
  
  // Extrai apenas as chaves de permissão para um array simples (ex: ['dashboard:view', 'users:read'])
  const permissionKeys = userPermissions.map(p => p.permissionKey);
  // -----------------------------------------------------------

  // 4. Gerar o token JWT com as permissões no payload
  const payload = {
    id: user.id,
    profile: user.profile, // O perfil ainda é útil, especialmente para a regra "ADMIN pode tudo"
    permissions: permissionKeys, // Array de permissões do usuário
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  // 5. Retornar os dados do usuário (sem a senha) e o token
  user.password = undefined; // Nunca retorne a senha na resposta da API
  
  return { user, token };
};

module.exports = {
  login,
};