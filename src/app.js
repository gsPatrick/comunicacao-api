'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models');
const routes = require('./routes');
const { User } = require('./models'); // Importar o modelo de usuário
const bcrypt = require('bcryptjs');

const app = express();

// --- CONFIGURAÇÃO DE CORS ABERTA ---
// Esta configuração libera o acesso para qualquer origem (*).
// É crucial que isso venha ANTES de qualquer definição de rota.
app.use(cors());

// Middlewares essenciais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota principal da API
app.use('/api', routes);

// Rota de health check para verificar se a API está no ar
app.get('/', (req, res) => {
  res.send('API SAGEPE está funcionando corretamente!');
});

// Função para criar o administrador padrão se ele não existir
const createDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123';

  try {
    const [user, created] = await User.findOrCreate({
      where: { email: adminEmail },
      defaults: {
        name: 'Administrador Padrão',
        email: adminEmail,
        password: adminPassword, // O hook do modelo fará o hash
        profile: 'ADMIN',
        isActive: true
      }
    });

    if (created) {
      console.log('Usuário administrador padrão criado com sucesso.');
    } else {
      console.log('Usuário administrador padrão já existe.');
    }
  } catch (error) {
    console.error('Erro ao criar o usuário administrador padrão:', error);
  }
};


const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Sincroniza o banco de dados
    await db.sequelize.sync(); 
    console.log('Banco de dados sincronizado com sucesso.');

    // Após sincronizar, garante que o admin padrão exista
    await createDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Não foi possível conectar ao banco de dados:', error);
  }
};

startServer();