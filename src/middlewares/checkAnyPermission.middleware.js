'use strict';

const { UserPermission } = require('../models');
const { Op } = require('sequelize');

/**
 * Middleware de autorização que verifica se o usuário autenticado possui
 * PELO MENOS UMA das permissões listadas no array `requiredPermissions`.
 *
 * Esta abordagem é ideal para endpoints de listagem (GET) onde diferentes
 * níveis de acesso podem visualizar a mesma tela, mas com dados filtrados
 * de forma diferente na camada de serviço (ex: 'ver próprios', 'ver da empresa', 'ver todos').
 *
 * @param {string[]} [requiredPermissions=[]] - Um array com as chaves de permissão a serem verificadas.
 * @returns {function(req, res, next): void} - A função de middleware do Express.
 */
module.exports = (requiredPermissions = []) => {
  return async (req, res, next) => {
    // As informações do usuário devem ter sido anexadas ao 'req' pelo 'auth.middleware'
    const { userId, userProfile } = req;

    // --- REGRA 1: ADMIN tem acesso irrestrito ---
    // Esta é uma regra de negócio global para simplificar o gerenciamento.
    // O ADMIN sempre ignora as verificações de permissão.
    if (userProfile === 'ADMIN') {
      return next();
    }

    // --- REGRA 2: Validação de entrada ---
    // Se, por algum motivo, o middleware for chamado sem uma lista de permissões,
    // ele permite a passagem por padrão para evitar bloqueios inesperados.
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return next();
    }

    try {
      // --- REGRA 3: Verificação no Banco de Dados ---
      // Consulta a tabela de junção `UserPermission` para ver se existe
      // UMA ÚNICA entrada que combine o ID do usuário com QUALQUER UMA
      // das permissões necessárias. `findOne` é usado para otimização,
      // pois só precisamos saber se a permissão existe, não quantas existem.
      const hasPermission = await UserPermission.findOne({
        where: {
          userId: userId,
          permissionKey: {
            [Op.in]: requiredPermissions,
          },
        },
        // Não precisamos dos atributos, apenas da confirmação da existência do registro.
        attributes: ['userId'] 
      });

      // Se `hasPermission` não for nulo, significa que uma correspondência foi encontrada.
      if (hasPermission) {
        return next(); // O usuário tem a permissão necessária. Prossiga para a próxima etapa.
      }

      // Se `hasPermission` for nulo, o usuário não possui nenhuma das permissões exigidas.
      return res.status(403).json({
        error: 'Access denied. You do not have sufficient permissions to access this resource.'
      });

    } catch (error) {
      // --- REGRA 4: Tratamento de Erro Interno ---
      // Captura qualquer erro que possa ocorrer durante a consulta ao banco de dados.
      console.error('Permission check middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error during permission check.'
      });
    }
  };
};