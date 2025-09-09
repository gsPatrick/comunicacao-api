/**
 * SCRIPT DE SEEDING LOCAL E INDEPENDENTE
 * ---------------------------------------
 * Instruções:
 * 1. Coloque este arquivo na raiz do seu projeto backend.
 * 2. Coloque a planilha 'database_structure.xlsx' na mesma pasta.
 * 3. Execute `npm install` para garantir que as dependências (Sequelize, pg, xlsx) estejam instaladas.
 * 4. Execute o script no seu terminal com o comando: `node seed-local.js`
 *
 * ATENÇÃO: Este script irá apagar TODOS os dados do banco e recriá-los do zero.
 */

const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');

// --- DADOS DO BANCO DE DADOS (HARDCODED) ---
const DB_CONFIG = {
  database: 'cadastrofuncionariobd',
  username: 'cadastrofuncionariobd',
  password: 'cadastrofuncionariobd',
  host: '69.62.99.122',
  port: 5000,
  dialect: 'postgres',
  dialectOptions: { ssl: false },
  logging: false, // Desativa os logs SQL para um output mais limpo
  define: { timestamps: true, underscored: true, underscoredAll: true },
};
// ------------------------------------------


const filePath = path.join(__dirname, 'database_structure.xlsx');

const seedDatabase = async () => {
  console.log(`⏳ Conectando ao banco de dados em ${DB_CONFIG.host}...`);
  const sequelize = new Sequelize(DB_CONFIG.database, DB_CONFIG.username, DB_CONFIG.password, DB_CONFIG);
  
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão bem-sucedida.');
  } catch (error) {
    console.error('❌ Falha ao conectar ao banco de dados:', error);
    return;
  }

  // --- DEFINIÇÃO DOS MODELOS DIRETAMENTE NO SCRIPT ---
  class User extends Model {}
  User.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, name: { type: DataTypes.STRING, allowNull: false }, email: { type: DataTypes.STRING, allowNull: false, unique: true }, password: { type: DataTypes.STRING, allowNull: false }, phone: DataTypes.STRING, profile: { type: DataTypes.ENUM('ADMIN', 'RH', 'GESTAO', 'SOLICITANTE'), allowNull: false }, isActive: { type: DataTypes.BOOLEAN, defaultValue: true } }, { sequelize, modelName: 'User', hooks: { beforeCreate: async (user) => { user.password = await bcrypt.hash(user.password, 8); }, beforeUpdate: async(user) => { if (user.changed('password')) { user.password = await bcrypt.hash(user.password, 8); } } } });

  class Company extends Model {}
  Company.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, corporateName: { type: DataTypes.STRING, allowNull: false }, tradeName: DataTypes.STRING, cnpj: { type: DataTypes.STRING, allowNull: false, unique: true }, address: DataTypes.STRING }, { sequelize, modelName: 'Company' });

  class Contract extends Model {}
  Contract.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, name: { type: DataTypes.STRING, allowNull: false }, contractNumber: { type: DataTypes.STRING, unique: true }, startDate: DataTypes.DATE, endDate: DataTypes.DATE }, { sequelize, modelName: 'Contract' });

  class Position extends Model {}
  Position.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, name: { type: DataTypes.STRING, allowNull: false, unique: true }, description: DataTypes.TEXT }, { sequelize, modelName: 'Position' });

  class WorkLocation extends Model {}
  WorkLocation.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, name: { type: DataTypes.STRING, allowNull: false }, address: DataTypes.STRING }, { sequelize, modelName: 'WorkLocation' });

  class CompanyPosition extends Model {}
  CompanyPosition.init({ companyId: { type: DataTypes.UUID, references: { model: 'Companies', key: 'id' }, primaryKey: true }, positionId: { type: DataTypes.UUID, references: { model: 'Positions', key: 'id' }, primaryKey: true } }, { sequelize, modelName: 'CompanyPosition' });
  
  class Workflow extends Model {}
  Workflow.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, name: { type: DataTypes.STRING, allowNull: false, unique: true }, description: DataTypes.TEXT, isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true } }, { sequelize, modelName: 'Workflow', tableName: 'Workflows' });

  // Definindo associações
  Contract.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  WorkLocation.belongsTo(Contract, { foreignKey: 'contractId', as: 'contract' });
  Company.belongsToMany(Position, { through: CompanyPosition, foreignKey: 'companyId', as: 'positions' });
  Position.belongsToMany(Company, { through: CompanyPosition, foreignKey: 'positionId', as: 'companies' });
  
  const models = { User, Company, Contract, Position, WorkLocation, CompanyPosition, Workflow };
  // --------------------------------------------------------
  
  console.log('⏳ Sincronizando tabelas (isso irá apagar os dados existentes)...');
  await sequelize.sync({ force: true });
  console.log('✅ Tabelas sincronizadas.');

  const transaction = await sequelize.transaction();
  console.log('⏳ Iniciando transação de seeding...');

  try {
    await models.User.findOrCreate({ where: { email: 'admin@admin.com' }, defaults: { name: 'Administrador Padrão', email: 'admin@admin.com', password: 'Admin123', profile: 'ADMIN', isActive: true }, transaction });
    console.log('- Usuário Admin criado/verificado.');

    const workflows = [{ name: 'ADMISSAO' }, { name: 'DESLIGAMENTO' }, { name: 'SUBSTITUICAO' }];
    for (const wf of workflows) { await models.Workflow.findOrCreate({ where: { name: wf.name }, defaults: wf, transaction }); }
    console.log('- Workflows padrão criados/verificados.');

    const workbook = xlsx.readFile(filePath);
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    console.log(`- Lendo planilha: ${data.length} registros encontrados.`);

    const companyNames = new Set(data.map(r => r.Contrato.split(' ')[0]));
    const companiesToCreate = Array.from(companyNames).map(name => ({ corporateName: name, tradeName: name, cnpj: `${Math.floor(10 + Math.random() * 90)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}/0001-${Math.floor(10 + Math.random() * 90)}` }));
    await models.Company.bulkCreate(companiesToCreate, { ignoreDuplicates: true, transaction });
    console.log(`- ${companiesToCreate.length} Clientes (Companies) inseridos.`);

    const positionNames = new Set(data.map(r => r.Categoria));
    await models.Position.bulkCreate(Array.from(positionNames).map(name => ({ name })), { ignoreDuplicates: true, transaction });
    console.log(`- ${positionNames.size} Categorias (Positions) inseridas.`);
    
    const allCompanies = await models.Company.findAll({ transaction });
    const allPositions = await models.Position.findAll({ transaction });
    const companyMap = new Map(allCompanies.map(c => [c.corporateName, c.id]));
    const positionMap = new Map(allPositions.map(p => [p.name, p.id]));

    const uniqueContracts = new Map(data.map(r => [r.Contrato, { name: r.Contrato, contractNumber: r.Contrato, companyId: companyMap.get(r.Contrato.split(' ')[0]) }]));
    await models.Contract.bulkCreate(Array.from(uniqueContracts.values()), { ignoreDuplicates: true, transaction });
    console.log(`- ${uniqueContracts.size} Contratos inseridos.`);

    const allContracts = await models.Contract.findAll({ transaction });
    const contractMap = new Map(allContracts.map(c => [c.name, c.id]));

    const uniqueWorkLocations = new Map(data.map(r => [`${contractMap.get(r.Contrato)}-${r.Loc_Trabalho}`, { name: r.Loc_Trabalho, contractId: contractMap.get(r.Contrato) }]));
    await models.WorkLocation.bulkCreate(Array.from(uniqueWorkLocations.values()), { ignoreDuplicates: true, transaction });
    console.log(`- ${uniqueWorkLocations.size} Locais de Trabalho inseridos.`);

    const companyPositionPairs = new Set(data.map(r => `${companyMap.get(r.Contrato.split(' ')[0])}-${positionMap.get(r.Categoria)}`));
    const companyPositionToCreate = Array.from(companyPositionPairs).map(p => { const [cId, pId] = p.split('-'); return { companyId: cId, positionId: pId }; });
    await models.CompanyPosition.bulkCreate(companyPositionToCreate, { ignoreDuplicates: true, transaction });
    console.log(`- ${companyPositionToCreate.length} associações Cliente-Categoria criadas.`);

    await transaction.commit();
    console.log('\n✅ PROCESSO CONCLUÍDO COM SUCESSO! Banco de dados populado.');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ ERRO: Ocorreu um erro durante o seeding. Todas as alterações foram desfeitas.', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexão com o banco de dados fechada.');
  }
};

seedDatabase();