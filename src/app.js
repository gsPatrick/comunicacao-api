'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models');
const routes = require('./routes');
const { User, Workflow } = require('./models');
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

// Funções de seeding agora aceitam uma transação para garantir atomicidade
const createDefaultAdmin = async ({ transaction }) => {
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
      },
      transaction // Passa a transação
    });
    if (created) console.log('- Usuário administrador padrão criado com sucesso.');
    else console.log('- Usuário administrador padrão já existe.');
  } catch (error) {
    console.error('Erro ao criar o usuário administrador padrão:', error);
    throw error; // Relança o erro para que a transação seja desfeita
  }
};

const createDefaultWorkflows = async ({ transaction }) => {
  const workflowsToCreate = [
    { name: 'ADMISSAO', description: 'Processo para contratar novos colaboradores.' },
    { name: 'DESLIGAMENTO', description: 'Processo para desligar colaboradores.' },
    { name: 'SUBSTITUICAO', description: 'Processo para substituir um colaborador existente.' },
  ];

  try {
    for (const wf of workflowsToCreate) {
      const [workflow, created] = await Workflow.findOrCreate({
        where: { name: wf.name },
        defaults: { description: wf.description, isActive: true },
        transaction // Passa a transação
      });
      if (created) console.log(`- Workflow padrão "${wf.name}" criado com sucesso.`);
      else console.log(`- Workflow padrão "${wf.name}" já existe.`);
    }
  } catch (error) {
    console.error('Erro ao criar workflows padrão:', error);
    throw error; // Relança o erro para que a transação seja desfeita
  }
};

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Sincroniza o banco de dados forçando recriação das tabelas
    await db.sequelize.sync({ force: true }); 
    console.log('Banco de dados sincronizado com sucesso (force: true).');

    // --- INICIA UMA TRANSAÇÃO PARA TODO O PROCESSO DE SEEDING ---
    console.log('Iniciando seeding de dados essenciais...');
    const transaction = await db.sequelize.transaction();
    try {
      // Garante que os dados essenciais existam
      await createDefaultAdmin({ transaction });
      await createDefaultWorkflows({ transaction });
      
      // --- CHAMADA DO NOVO SEEDER AUTOMÁTICO ---
      await seedFromExcel({ transaction });

      // Se tudo ocorreu bem, commita a transação
      await transaction.commit();
      console.log('✅ Seeding automático concluído com sucesso!');
    } catch (seedError) {
      // Se qualquer parte do seeding falhar, desfaz tudo
      await transaction.rollback();
      console.error('❌ Falha no processo de seeding. Alterações desfeitas.', seedError);
      // Decide se quer parar o servidor ou continuar com o banco vazio
      throw new Error('Não foi possível popular o banco de dados.'); 
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Não foi possível iniciar o servidor:', error);
  }
};

startServer();