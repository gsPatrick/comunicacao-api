const userService = require('./user.service');
const xlsxService = require('../../utils/xlsx.service'); // Importa o serviço de XLSX

const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json(user);
  } catch (error) {
    // Tratamento de erro de e-mail duplicado
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email already in use.' });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const usersData = await userService.findAllUsers(req.query);
    return res.status(200).json(usersData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await userService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    // Regra: Apenas um ADMIN pode alterar o perfil de outro usuário.
    if (req.body.profile && req.userProfile !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can change user profiles.' });
    }

    const updatedUser = await userService.updateUser(req.params.id, req.body);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const success = await userService.softDeleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'User not found.' });
    }
    // HTTP 204 No Content é uma resposta padrão para sucesso sem corpo de resposta
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const exportUsers = async (req, res) => {
    try {
        const users = await userService.exportAllUsers(req.query);

        // Formata os dados para um formato plano e amigável para a planilha
        const formattedData = users.map(user => ({
            'ID': user.id,
            'Nome': user.name,
            'Email': user.email,
            'Telefone': user.phone,
            'Perfil': user.profile,
            'Status': user.isActive ? 'Ativo' : 'Inativo',
            'Data de Criação': user.createdAt,
        }));

        const buffer = xlsxService.jsonToXlsxBuffer(formattedData);
        const filename = `usuarios-${new Date().toISOString().slice(0,10)}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ error: 'Failed to export user data.', details: error.message });
    }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  exportUsers, // Adiciona a nova função à exportação
};