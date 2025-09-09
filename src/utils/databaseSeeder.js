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

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // CORREÇÃO: Pula a primeira linha (título) e usa a segunda linha como header
    let data = xlsx.utils.sheet_to_json(worksheet, {
      range: 1, // Começa da linha 2 (índice 1), que tem os headers corretos
      defval: null // Define valor padrão para células vazias
    });

    console.log(`- Total de linhas lidas: ${data.length}`);
    console.log('- Headers detectados:', Object.keys(data[0] || {}));
    console.log('- Exemplo de dados:', JSON.stringify(data.slice(0, 2), null, 2));

    // Filtra linhas inválidas - agora vai funcionar porque os campos têm nomes corretos
    const originalCount = data.length;
    data = data.filter(row => row.Contrato && row.Categoria && row.Loc_Trabalho);
    
    console.log(`- Linhas antes do filtro: ${originalCount}`);
    console.log(`- Linhas após filtro: ${data.length}`);
    console.log(`- Encontrados ${data.length} registros válidos de relacionamento na planilha.`);

    if (data.length === 0) {
      console.warn('- AVISO: Nenhum dado válido encontrado para popular o banco.');
      return;
    }

    // Cria empresas baseadas na primeira palavra do contrato
    const companyNames = new Set(data.map(row => row.Contrato.split(' ')[0]));
    const companiesToCreate = Array.from(companyNames).map(name => ({
        corporateName: name,
        tradeName: name,
        cnpj: `${Math.floor(10 + Math.random() * 90)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}/0001-${Math.floor(10 + Math.random() * 90)}`,
    }));
    await Company.bulkCreate(companiesToCreate, { ignoreDuplicates: true, transaction });
    console.log(`- ${companiesToCreate.length} Clientes (Companies) inseridos/verificados.`);

    // Cria posições
    const positionNames = new Set(data.map(row => row.Categoria));
    const positionsToCreate = Array.from(positionNames).map(name => ({ name }));
    await Position.bulkCreate(positionsToCreate, { ignoreDuplicates: true, transaction });
    console.log(`- ${positionsToCreate.length} Categorias (Positions) inseridas/verificadas.`);
    
    // Busca dados criados para fazer os relacionamentos
    const allCompanies = await Company.findAll({ transaction });
    const allPositions = await Position.findAll({ transaction });
    const companyMap = new Map(allCompanies.map(c => [c.corporateName, c.id]));
    const positionMap = new Map(allPositions.map(p => [p.name, p.id]));

    // Cria contratos únicos
    const uniqueContracts = new Map();
    data.forEach(row => {
        const companyName = row.Contrato.split(' ')[0];
        const companyId = companyMap.get(companyName);
        if (companyId && !uniqueContracts.has(row.Contrato)) {
            uniqueContracts.set(row.Contrato, { 
              name: row.Contrato, 
              contractNumber: row.Contrato, 
              companyId 
            });
        }
    });
    await Contract.bulkCreate(Array.from(uniqueContracts.values()), { ignoreDuplicates: true, transaction });
    console.log(`- ${uniqueContracts.size} Contratos inseridos/verificados.`);

    // Busca contratos para criar locais de trabalho
    const allContracts = await Contract.findAll({ transaction });
    const contractMap = new Map(allContracts.map(c => [c.name, c.id]));

    // Cria locais de trabalho únicos
    const uniqueWorkLocations = new Map();
    data.forEach(row => {
        const contractId = contractMap.get(row.Contrato);
        const locationName = row.Loc_Trabalho;
        const uniqueKey = `${contractId}-${locationName}`;
        if (contractId && locationName && !uniqueWorkLocations.has(uniqueKey)) {
            uniqueWorkLocations.set(uniqueKey, { 
              name: locationName, 
              contractId 
            });
        }
    });
    await WorkLocation.bulkCreate(Array.from(uniqueWorkLocations.values()), { ignoreDuplicates: true, transaction });
    console.log(`- ${uniqueWorkLocations.size} Locais de Trabalho inseridos/verificados.`);

    // Cria associações empresa-posição
    const uniqueCompanyPosition = new Set();
    data.forEach(row => {
        const companyId = companyMap.get(row.Contrato.split(' ')[0]);
        const positionId = positionMap.get(row.Categoria);
        if (companyId && positionId) {
            uniqueCompanyPosition.add(`${companyId}-${positionId}`);
        }
    });
    const companyPositionToCreate = Array.from(uniqueCompanyPosition).map(pair => {
        const [companyId, positionId] = pair.split('-');
        return { 
          companyId: parseInt(companyId), 
          positionId: parseInt(positionId) 
        };
    });
    await CompanyPosition.bulkCreate(companyPositionToCreate, { ignoreDuplicates: true, transaction });
    console.log(`- ${companyPositionToCreate.length} associações Cliente-Categoria criadas.`);

    console.log('Seeding da estrutura do Excel concluído com sucesso.');
    
  } catch (error) {
    console.error('Erro durante o seeding do Excel:', error.message);
    throw error;
  }
};

module.exports = { seedFromExcel };