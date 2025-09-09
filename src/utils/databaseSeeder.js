const path = require('path');
const xlsx = require('xlsx');
const { Company, Contract, Position, WorkLocation, CompanyPosition } = require('../models');

const filePath = path.join(__dirname, '../scripts/database_structure.xlsx');

/**
 * Função reutilizável para popular o banco com a estrutura do Excel.
 * @param {object} options - Opções, incluindo a transação.
 * @param {import('sequelize').Transaction} options.transaction - A transação do Sequelize.
 */
const seedFromExcel = async ({ transaction }) => {
  console.log('Iniciando seeding da estrutura a partir do Excel...');

  // === ADICIONANDO DEBUG ===
  console.log('=== DEBUG DO EXCEL ===');
  console.log('Caminho do arquivo:', filePath);
  console.log('Arquivo existe?', require('fs').existsSync(filePath));

  try {
    const workbook = xlsx.readFile(filePath);
    console.log('Planilhas disponíveis:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    console.log('Usando planilha:', sheetName);
    
    const worksheet = workbook.Sheets[sheetName];
    console.log('Range da planilha:', worksheet['!ref']);
    
    // Mostra as primeiras linhas
    const range = xlsx.utils.decode_range(worksheet['!ref']);
    console.log(`Planilha tem ${range.e.r + 1} linhas e ${range.e.c + 1} colunas`);
    
    console.log('=== PRIMEIRAS 5 LINHAS BRUTAS ===');
    for (let row = 0; row <= Math.min(4, range.e.r); row++) {
      const rowData = [];
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        rowData.push(cell ? cell.v : '(vazio)');
      }
      console.log(`LINHA ${row}:`, JSON.stringify(rowData));
    }
    
    // Seu código original
    let data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log('=== APÓS sheet_to_json ===');
    console.log('Total de linhas lidas:', data.length);
    console.log('Headers detectados:', Object.keys(data[0] || {}));
    console.log('Primeiras 3 linhas:', JSON.stringify(data.slice(0, 3), null, 2));

    // --- CORREÇÃO APLICADA AQUI: Filtra linhas inválidas ---
    const originalCount = data.length;
    data = data.filter(row => row.Contrato && row.Categoria && row.Loc_Trabalho);
    
    console.log('=== APÓS FILTRO ===');
    console.log(`Linhas antes do filtro: ${originalCount}`);
    console.log(`Linhas após filtro: ${data.length}`);
    
    if (data.length === 0) {
      console.log('=== ANÁLISE DO PROBLEMA ===');
      // Vamos ver quais campos existem realmente
      const originalData = xlsx.utils.sheet_to_json(worksheet);
      if (originalData.length > 0) {
        console.log('Campos disponíveis no primeiro registro:');
        Object.keys(originalData[0]).forEach(key => {
          console.log(`- "${key}" = "${originalData[0][key]}"`);
        });
        
        console.log('\nVerificando se campos existem:');
        console.log('- Tem "Contrato"?', !!originalData[0].Contrato);
        console.log('- Tem "Categoria"?', !!originalData[0].Categoria);  
        console.log('- Tem "Loc_Trabalho"?', !!originalData[0].Loc_Trabalho);
      }
      return; // Para aqui para não continuar com dados vazios
    }

    console.log(`- Encontrados ${data.length} registros válidos de relacionamento na planilha.`);

    // O resto do seu código original continua igual...
    const companyNames = new Set(data.map(row => row.Contrato.split(' ')[0]));
    const companiesToCreate = Array.from(companyNames).map(name => ({
        corporateName: name,
        tradeName: name,
        cnpj: `${Math.floor(10 + Math.random() * 90)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}/0001-${Math.floor(10 + Math.random() * 90)}`,
    }));
    await Company.bulkCreate(companiesToCreate, { ignoreDuplicates: true, transaction });
    console.log(`- ${companiesToCreate.length} Clientes (Companies) inseridos/verificados.`);

    const positionNames = new Set(data.map(row => row.Categoria));
    const positionsToCreate = Array.from(positionNames).map(name => ({ name }));
    await Position.bulkCreate(positionsToCreate, { ignoreDuplicates: true, transaction });
    console.log(`- ${positionsToCreate.length} Categorias (Positions) inseridas/verificadas.`);
    
    const allCompanies = await Company.findAll({ transaction });
    const allPositions = await Position.findAll({ transaction });
    const companyMap = new Map(allCompanies.map(c => [c.corporateName, c.id]));
    const positionMap = new Map(allPositions.map(p => [p.name, p.id]));

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

    const allContracts = await Contract.findAll({ transaction });
    const contractMap = new Map(allContracts.map(c => [c.name, c.id]));

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
    
  } catch (error) {
    console.log('=== ERRO AO LER EXCEL ===');
    console.log('Erro:', error.message);
    console.log('Stack:', error.stack);
  }
};

module.exports = { seedFromExcel };