const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');

/**
 * Autentica um usuário e gera um token JWT.
 * @param {string} email - O email do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<{user: object, token: string}>} Um objeto com os dados do usuário e o token.
 * @throws {Error} Lança um erro se as credenciais forem inválidas ou o usuário estiver inativo.
 */
const login = async (email, password) => {
  // 1. Encontrar o usuário pelo email
  const user = await User.findOne({ where: { email } });
  
  if (!user) {
    throw new Error('Invalid credentials'); // Erro genérico para não informar se o email existe
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

  // 4. Gerar o token JWT
  const payload = {
    id: user.id,
    profile: user.profile,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  // 5. Retornar os dados do usuário (sem a senha) e o token
  user.password = undefined;
  return { user, token };
};

module.exports = {
  login,
};