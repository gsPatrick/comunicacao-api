module.exports = (allowedProfiles) => {
  return (req, res, next) => {
    const { userProfile } = req; // Obtém o perfil do middleware de autenticação

    if (!userProfile || !allowedProfiles.includes(userProfile)) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to perform this action.' });
    }

    return next();
  };
};