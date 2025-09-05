'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models');
const routes = require('./routes');
const { User, Workflow } = require('./models'); // Importar também o modelo Workflow
const bcrypt = require('bcryptjs');
const { seedFromExcel } = require('./utils/databaseSeeder'); // <-- IMPORTA O NOVO SEEDER

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('API SAGEPE está funcionando corretamente!');
});

// Função para criar o administrador padrão
const createDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123';
  try {
    const [user, created] = await User.findOrCreate({
      where: { email: adminEmail },
      defaults: {
        name: 'Administrador Padrão',
        email: adminEmail,
        password: adminPassword,
        profile: 'ADMIN',
        isActive: true
      }
    });
    if (created) console.log('Usuário administrador padrão criado com sucesso.');
    else console.log('Usuário administrador padrão já existe.');
  } catch (error) {
    console.error('Erro ao criar o usuário administrador padrão:', error);
  }
};

// --- NOVA FUNÇÃO PARA CRIAR WORKFLOWS PADRÃO ---
const createDefaultWorkflows = async () => {
  const workflowsToCreate = [
    { name: 'ADMISSAO', description: 'Processo para contratar novos colaboradores.' },
    { name: 'DESLIGAMENTO', description: 'Processo para desligar colaboradores.' },
    { name: 'SUBSTITUICAO', description: 'Processo para substituir um colaborador existente.' },
  ];

  try {
    for (const wf of workflowsToCreate) {
      const [workflow, created] = await Workflow.findOrCreate({
        where: { name: wf.name },
        defaults: { description: wf.description, isActive: true }
      });
      if (created) {
        console.log(`Workflow padrão "${wf.name}" criado com sucesso.`);
      } else {
        console.log(`Workflow padrão "${wf.name}" já existe.`);
      }
    }
  } catch (error) {
    console.error('Erro ao criar workflows padrão:', error);
  }
};


const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Sincroniza o banco de dados forçando recriação das tabelas
    await db.sequelize.sync({ force: false }); 
    console.log('Banco de dados sincronizado com sucesso (force: true).');

    // Garante que os dados essenciais existam
    await createDefaultAdmin();
    await createDefaultWorkflows(); // <-- CHAMADA DA NOVA FUNÇÃO

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Não foi possível conectar ao banco de dados:', error);
  }
};

startServer();