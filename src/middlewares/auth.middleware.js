const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { User } = require('../models');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided.' });
  }

  // O header vem como "Bearer TOKEN", então separamos em duas partes
  const [, token] = authHeader.split(' ');

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Anexamos o id e o perfil do usuário ao objeto req para uso posterior
    req.userId = decoded.id;
    req.userProfile = decoded.profile;

    // Opcional: Verificar se o usuário ainda existe e está ativo
    const user = await User.findByPk(req.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User is not active or does not exist.' });
    }

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};