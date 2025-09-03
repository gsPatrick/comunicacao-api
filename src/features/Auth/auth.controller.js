const authService = require('./auth.service');

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const loginData = await authService.login(email, password);
    return res.status(200).json(loginData);
  } catch (error) {
    // Trata os erros lançados pelo serviço (credenciais inválidas, usuário inativo)
    return res.status(401).json({ error: error.message });
  }
};

module.exports = {
  login,
};