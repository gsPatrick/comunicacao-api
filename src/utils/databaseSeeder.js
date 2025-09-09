const path = require('path');
const xlsx = require('xlsx');
const { Company, Contract, Position, WorkLocation, CompanyPosition } = require('../models');

const filePath = path.join(__dirname, '../scripts/database_structure.xlsx');

const seedFromExcel = async ({ transaction }) => {
  console.log('Iniciando seeding da estrutura a partir do Excel (Lógica de Inserção Completa)...');

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
      console.warn('- AVISO: Nenhum dado válido encontrado.');
      return;
  }

  // ETAPA 1: Criar as entidades únicas (sem repetição)
  const companyNames = new Set(data.map(row => row.Contrato.split(' ')[0]));
  const companiesToCreate = Array.from(companyNames).map(name => ({
      corporateName: name,
      tradeName: name,
      cnpj: `${Math.floor(10 + Math.random() * 90)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}/0001-${Math.floor(10 + Math.random() * 90)}`,
  }));
  await Company.bulkCreate(companiesToCreate, { ignoreDuplicates: true, transaction });
  console.log(`- ${companiesToCreate.length} Clientes (Companies) únicos criados/verificados.`);

  const positionNames = new Set(data.map(row => row.Categoria));
  const positionsToCreate = Array.from(positionNames).map(name => ({ name }));
  await Position.bulkCreate(positionsToCreate, { ignoreDuplicates: true, transaction });
  console.log(`- ${positionsToCreate.length} Categorias (Positions) únicas criadas/verificadas.`);
  
  const allCompanies = await Company.findAll({ transaction });
  const companyMap = new Map(allCompanies.map(c => [c.corporateName, c.id]));

  const uniqueContractsMap = new Map();
  data.forEach(row => {
      const companyName = row.Contrato.split(' ')[0];
      const companyId = companyMap.get(companyName);
      if (companyId && !uniqueContractsMap.has(row.Contrato)) {
          uniqueContractsMap.set(row.Contrato, { name: row.Contrato, contractNumber: row.Contrato, companyId });
      }
  });
  await Contract.bulkCreate(Array.from(uniqueContractsMap.values()), { ignoreDuplicates: true, transaction });
  console.log(`- ${uniqueContractsMap.size} Contratos únicos criados/verificados.`);

  // ETAPA 2: Mapear IDs e criar TODAS as associações
  const allPositions = await Position.findAll({ transaction });
  const allContracts = await Contract.findAll({ transaction });
  const positionMap = new Map(allPositions.map(p => [p.name, p.id]));
  const contractMap = new Map(allContracts.map(c => [c.name, c.id]));

  // --- LÓGICA DE INSERÇÃO CORRIGIDA ---
  // Gera uma lista com TODAS as combinações de local de trabalho da planilha
  const workLocationsToCreate = data.map(row => {
      const contractId = contractMap.get(row.Contrato);
      const locationName = row.Loc_Trabalho;
      if (contractId && locationName) {
          return { name: locationName, contractId };
      }
      return null;
  }).filter(Boolean); // Remove quaisquer entradas nulas
  
  await WorkLocation.bulkCreate(workLocationsToCreate, { ignoreDuplicates: true, transaction });
  console.log(`- Tentativa de inserção de ${workLocationsToCreate.length} Locais de Trabalho. O banco de dados ignorará as duplicatas.`);

  // Gera uma lista com TODAS as associações empresa-categoria da planilha
  const companyPositionToCreate = data.map(row => {
      const companyId = companyMap.get(row.Contrato.split(' ')[0]);
      const positionId = positionMap.get(row.Categoria);
      if (companyId && positionId) {
          return { companyId, positionId };
      }
      return null;
  }).filter(Boolean);
  
  await CompanyPosition.bulkCreate(companyPositionToCreate, { ignoreDuplicates: true, transaction });
  console.log(`- Tentativa de inserção de ${companyPositionToCreate.length} associações Cliente-Categoria. O banco de dados ignorará as duplicatas.`);

  console.log('Seeding da estrutura do Excel concluído.');
};

module.exports = { seedFromExcel };