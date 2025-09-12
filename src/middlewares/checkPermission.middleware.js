const { UserPermission } = require('../models');
const { Op } = require('sequelize');

/**
 * Middleware para verificar se o usuário tem QUALQUER UMA das permissões listadas.
 * Útil para endpoints de listagem onde diferentes níveis de acesso são permitidos.
 */
module.exports = (requiredPermissions = []) => {
  return async (req, res, next) => {
    const { userId, userProfile } = req;

    // Regra de ouro: ADMIN pode tudo.
    if (userProfile === 'ADMIN') {
      return next();
    }

    if (requiredPermissions.length === 0) {
      return next(); // Nenhuma permissão específica exigida
    }

    try {
      const permission = await UserPermission.findOne({
        where: {
          userId: userId,
          permissionKey: {
            [Op.in]: requiredPermissions,
          },
        },
      });

      if (!permission) {
        return res.status(403).json({ error: 'Access denied. You do not have sufficient permissions to perform this action.' });
      }

      return next();
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error during permission check.' });
    }
  };
};