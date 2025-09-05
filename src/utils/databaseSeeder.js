const path = require('path');
const xlsx = require('xlsx');
const { Company, Contract, Position, WorkLocation, CompanyPosition } = require('../models');

// Caminho para o arquivo Excel
const filePath = path.join(__dirname, '../scripts/database_structure.xlsx');

/**
 * Função reutilizável para popular o banco com a estrutura do Excel.
 * Ela espera receber uma transação para garantir que a operação seja atômica.
 * @param {object} options - Opções, incluindo a transação.
 * @param {import('sequelize').Transaction} options.transaction - A transação do Sequelize.
 */
const seedFromExcel = async ({ transaction }) => {
  console.log('Iniciando seeding da estrutura a partir do Excel...');

  // 1. Ler a planilha
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  console.log(`- Encontrados ${data.length} registros de relacionamento na planilha.`);

  // 2. Processar e inserir Clientes (Companies)
  const companyNames = new Set(data.map(row => row.Contrato.split(' ')[0]));
  const companiesToCreate = Array.from(companyNames).map(name => ({
      corporateName: name,
      tradeName: name,
      cnpj: `${Math.floor(10 + Math.random() * 90)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}/0001-${Math.floor(10 + Math.random() * 90)}`,
  }));
  await Company.bulkCreate(companiesToCreate, { ignoreDuplicates: true, transaction });
  console.log(`- ${companiesToCreate.length} Clientes (Companies) inseridos/verificados.`);

  // 3. Processar e inserir Categorias (Positions)
  const positionNames = new Set(data.map(row => row.Categoria));
  const positionsToCreate = Array.from(positionNames).map(name => ({ name }));
  await Position.bulkCreate(positionsToCreate, { ignoreDuplicates: true, transaction });
  console.log(`- ${positionsToCreate.length} Categorias (Positions) inseridas/verificadas.`);
  
  // 4. Mapear Nomes para IDs
  const allCompanies = await Company.findAll({ transaction });
  const allPositions = await Position.findAll({ transaction });
  const companyMap = new Map(allCompanies.map(c => [c.corporateName, c.id]));
  const positionMap = new Map(allPositions.map(p => [p.name, p.id]));

  // 5. Processar e inserir Contratos
  const uniqueContracts = new Map();
  data.forEach(row => {
      const companyName = row.Contrato.split(' ')[0];
      const companyId = companyMap.get(companyName);
      if (companyId && !uniqueContracts.has(row.Contrato)) {
          uniqueContracts.set(row.Contrato, { name: row.Contrato, contractNumber: row.Contrato, companyId });
      }
  });
  await Contract.bulkCreate(Array.from(uniqueContracts.values()), { ignoreDuplicates: true, transaction });
  console.log(`- ${uniqueContracts.size} Contratos inseridos/verificados.`);

  // 6. Mapear Contratos para IDs
  const allContracts = await Contract.findAll({ transaction });
  const contractMap = new Map(allContracts.map(c => [c.name, c.id]));

  // 7. Processar e inserir Locais de Trabalho
  const uniqueWorkLocations = new Map();
  data.forEach(row => {
      const contractId = contractMap.get(row.Contrato);
      const locationName = row.Loc_Trabalho;
      const uniqueKey = `${contractId}-${locationName}`;
      if (contractId && locationName && !uniqueWorkLocations.has(uniqueKey)) {
          uniqueWorkLocations.set(uniqueKey, { name: locationName, contractId });
      }
  });
  await WorkLocation.bulkCreate(Array.from(uniqueWorkLocations.values()), { ignoreDuplicates: true, transaction });
  console.log(`- ${uniqueWorkLocations.size} Locais de Trabalho inseridos/verificados.`);

  // 8. Processar associações Cliente <-> Categoria
  const uniqueCompanyPosition = new Set();
  data.forEach(row => {
      const companyId = companyMap.get(row.Contrato.split(' ')[0]);
      const positionId = positionMap.get(row.Categoria);
      if (companyId && positionId) uniqueCompanyPosition.add(`${companyId}-${positionId}`);
  });
  const companyPositionToCreate = Array.from(uniqueCompanyPosition).map(pair => {
      const [companyId, positionId] = pair.split('-');
      return { companyId, positionId };
  });
  await CompanyPosition.bulkCreate(companyPositionToCreate, { ignoreDuplicates: true, transaction });
  console.log(`- ${companyPositionToCreate.length} associações Cliente-Categoria criadas.`);

  console.log('Seeding da estrutura do Excel concluído.');
};

module.exports = { seedFromExcel };
