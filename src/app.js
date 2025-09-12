'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models');
const routes = require('./routes');
const { User, Workflow } = require('./models');
const bcrypt = require('bcryptjs');
const { seedFromExcel } = require('./utils/databaseSeeder');
const { seedPermissions } = require('./utils/seedPermissions'); // <-- 1. IMPORTAR A NOVA FUNÇÃO

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('API SAGEPE está funcionando corretamente!');
});

/**
 * Cria o usuário administrador padrão.
 * @param {object} options - Opções, incluindo a transação.
 * @param {import('sequelize').Transaction} options.transaction - A transação do Sequelize.
 */
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
      transaction
    });
    if (created) console.log('- Usuário administrador padrão criado com sucesso.');
    else console.log('- Usuário administrador padrão já existe.');
  } catch (error) {
    console.error('Erro ao criar o usuário administrador padrão:', error);
    throw error;
  }
};

/**
 * Cria os workflows padrão.
 * @param {object} options - Opções, incluindo a transação.
 * @param {import('sequelize').Transaction} options.transaction - A transação do Sequelize.
 */
const createDefaultWorkflows = async ({ transaction }) => {
  const workflowsToCreate = [
    { name: 'ADMISSAO', description: 'Processo para contratar novos colaboradores.' },
    { name: 'DESLIGAMENTO', description: 'Processo para desligar colaboradores.' },
    { name: 'SUBSTITUICAO', description: 'Processo para substituir um colaborador existente.' },
    { name: 'TROCA_DE_LOCAL', description: 'Processo para troca de local de trabalho de um colaborador.' },
  ];

  try {
    await Workflow.bulkCreate(workflowsToCreate, {
        ignoreDuplicates: true,
        transaction
    });
    console.log(`- Workflows padrão verificados/criados.`);
  } catch (error) {
    console.error('Erro ao criar workflows padrão:', error);
    throw error;
  }
};


const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Sincroniza o banco de dados forçando recriação das tabelas
    await db.sequelize.sync({ force: true }); 
    console.log('Banco de dados sincronizado com sucesso (force: true).');

    console.log('Iniciando seeding de dados essenciais...');
    const transaction = await db.sequelize.transaction();
    try {
      // 1. Popula as permissões PRIMEIRO, pois são a base
      await seedPermissions({ transaction }); // <-- 2. CHAMAR A FUNÇÃO AQUI

      // 2. Cria dados essenciais (admin, workflows)
      await createDefaultAdmin({ transaction });
      await createDefaultWorkflows({ transaction });
      
      // 3. Popula o banco com a estrutura do arquivo Excel
      await seedFromExcel({ transaction });

      await transaction.commit();
      console.log('✅ Seeding automático concluído com sucesso!');
    } catch (seedError) {
      await transaction.rollback();
      console.error('❌ Falha no processo de seeding. Alterações desfeitas.', seedError);
      throw new Error('Não foi possível popular o banco de dados com os dados iniciais.'); 
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Não foi possível iniciar o servidor:', error);
  }
};

startServer();