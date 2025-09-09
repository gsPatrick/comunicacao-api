const path = require('path');
const xlsx = require('xlsx');
const { Company, Contract, Position, WorkLocation, CompanyPosition } = require('../models');

const filePath = path.join(__dirname, '../scripts/database_structure.xlsx');

const seedFromExcel = async ({ transaction }) => {
  console.log('Iniciando seeding da estrutura a partir do Excel (Lógica de Relacionamento Completa)...');

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, range: 2 });

  const data = rows.map(row => ({
    Contrato: row[0],
    Categoria: row[1],
    Loc_Trabalho: row[2],
  })).filter(row => row.Contrato && row.Categoria && row.Loc_Trabalho);

  console.log(`- Encontrados ${data.length} registros válidos de relacionamento na planilha.`);
  if (data.length === 0) {
      console.warn('- AVISO: Nenhum dado válido encontrado para popular o banco.');
      return;
  }

  // ETAPA 1: Criar as entidades únicas (sem repetição)
  // ===================================================

  // Clientes (Companies)
  const companyNames = new Set(data.map(row => row.Contrato.split(' ')[0]));
  const companiesToCreate = Array.from(companyNames).map(name => ({
      corporateName: name,
      tradeName: name,
      cnpj: `${Math.floor(10 + Math.random() * 90)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}/0001-${Math.floor(10 + Math.random() * 90)}`,
  }));
  await Company.bulkCreate(companiesToCreate, { ignoreDuplicates: true, transaction });
  console.log(`- ${companiesToCreate.length} Clientes (Companies) únicos inseridos/verificados.`);

  // Categorias (Positions)
  const positionNames = new Set(data.map(row => row.Categoria));
  const positionsToCreate = Array.from(positionNames).map(name => ({ name }));
  await Position.bulkCreate(positionsToCreate, { ignoreDuplicates: true, transaction });
  console.log(`- ${positionsToCreate.length} Categorias (Positions) únicas inseridas/verificadas.`);
  
  // Contratos
  const uniqueContractsMap = new Map();
  const allCompanies = await Company.findAll({ transaction });
  const companyMap = new Map(allCompanies.map(c => [c.corporateName, c.id]));

  data.forEach(row => {
      const companyName = row.Contrato.split(' ')[0];
      const companyId = companyMap.get(companyName);
      if (companyId && !uniqueContractsMap.has(row.Contrato)) {
          uniqueContractsMap.set(row.Contrato, { name: row.Contrato, contractNumber: row.Contrato, companyId });
      }
  });
  await Contract.bulkCreate(Array.from(uniqueContractsMap.values()), { ignoreDuplicates: true, transaction });
  console.log(`- ${uniqueContractsMap.size} Contratos únicos inseridos/verificados.`);

  // ETAPA 2: Criar as associações baseadas em TODAS as linhas
  // =========================================================

  // Mapeia todos os nomes para IDs para fácil acesso
  const allPositions = await Position.findAll({ transaction });
  const allContracts = await Contract.findAll({ transaction });
  const positionMap = new Map(allPositions.map(p => [p.name, p.id]));
  const contractMap = new Map(allContracts.map(c => [c.name, c.id]));

  // Locais de Trabalho (WorkLocations)
  const workLocationsToCreate = [];
  const uniqueWorkLocations = new Set();
  data.forEach(row => {
      const contractId = contractMap.get(row.Contrato);
      const locationName = row.Loc_Trabalho;
      const uniqueKey = `${contractId}::${locationName}`;
      
      // Adiciona apenas se a combinação contrato-local for nova
      if (contractId && locationName && !uniqueWorkLocations.has(uniqueKey)) {
          workLocationsToCreate.push({ name: locationName, contractId });
          uniqueWorkLocations.add(uniqueKey);
      }
  });
  await WorkLocation.bulkCreate(workLocationsToCreate, { ignoreDuplicates: true, transaction });
  console.log(`- ${workLocationsToCreate.length} Locais de Trabalho únicos inseridos.`);

  // Associações Cliente-Categoria (CompanyPosition)
  const companyPositionToCreate = [];
  const uniqueCompanyPosition = new Set();
  data.forEach(row => {
      const companyId = companyMap.get(row.Contrato.split(' ')[0]);
      const positionId = positionMap.get(row.Categoria);
      const uniqueKey = `${companyId}::${positionId}`;

      // Adiciona apenas se a combinação empresa-categoria for nova
      if (companyId && positionId && !uniqueCompanyPosition.has(uniqueKey)) {
          companyPositionToCreate.push({ companyId, positionId });
          uniqueCompanyPosition.add(uniqueKey);
      }
  });
  
  await CompanyPosition.bulkCreate(companyPositionToCreate, { ignoreDuplicates: true, transaction });
  console.log(`- ${companyPositionToCreate.length} associações Cliente-Categoria únicas criadas.`);

  console.log('Seeding da estrutura do Excel concluído.');
};

module.exports = { seedFromExcel };