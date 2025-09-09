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
    
    // Primeira tentativa: ler automaticamente os headers da linha 2
    let data = xlsx.utils.sheet_to_json(worksheet, {
      range: 1, // pula a linha de título (primeira linha)
      defval: null // define valor padrão para células vazias
    });

    console.log("Headers detectados:", Object.keys(data[0] || {}));
    console.log("Exemplo de dados lidos (primeiras 3 linhas):", data.slice(0, 3));

    // Se não conseguir ler automaticamente, tenta com headers fixos
    if (!data.length || !data[0].Contrato) {
      console.log("Tentando com headers fixos...");
      data = xlsx.utils.sheet_to_json(worksheet, {
        range: 1,
        header: ["Contrato", "Categoria", "Loc_Trabalho", "TipoEmpresa"],
        defval: null
      });
      console.log("Dados com headers fixos:", data.slice(0, 3));
    }

    // Se ainda não funcionar, tenta começar da linha 2 (índice 1)
    if (!data.length || !data[0] || typeof data[0] !== 'object') {
      console.log("Tentando começar da linha 3...");
      data = xlsx.utils.sheet_to_json(worksheet, {
        range: 2, // pula as duas primeiras linhas
        defval: null
      });
      console.log("Dados começando da linha 3:", data.slice(0, 3));
    }

    // Limpa e valida os dados
    data = data.filter(row => {
      if (!row || typeof row !== 'object') return false;
      
      // Tenta diferentes variações dos nomes das colunas
      const contrato = row.Contrato || row.contrato || row.CONTRATO;
      const categoria = row.Categoria || row.categoria || row.CATEGORIA;
      const locTrabalho = row.Loc_Trabalho || row.loc_trabalho || row['Loc_Trabalho'] || row.LOC_TRABALHO;
      
      return contrato && categoria && locTrabalho;
    });

    console.log(`- Encontrados ${data.length} registros válidos de relacionamento na planilha.`);
    
    if (data.length === 0) {
      console.warn('- AVISO: Nenhum dado válido encontrado para popular o banco.');
      console.warn('- Verificando estrutura da planilha...');
      
      // Debug: mostra toda a estrutura da planilha
      const range = xlsx.utils.decode_range(worksheet['!ref']);
      console.log(`- Planilha tem ${range.e.r + 1} linhas e ${range.e.c + 1} colunas`);
      
      // Mostra as primeiras linhas brutas
      for (let row = 0; row <= Math.min(5, range.e.r); row++) {
        const rowData = [];
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          rowData.push(cell ? cell.v : null);
        }
        console.log(`- Linha ${row}:`, rowData);
      }
      
      return;
    }

    // Normaliza os dados para usar nomes consistentes
    data = data.map(row => ({
      Contrato: getColumnValue(row, ['Contrato', 'contrato', 'CONTRATO']),
      Categoria: getColumnValue(row, ['Categoria', 'categoria', 'CATEGORIA']),
      Loc_Trabalho: getColumnValue(row, ['Loc_Trabalho', 'loc_trabalho', 'LOC_TRABALHO', 'Loc_trabalho', 'Loc Trabalho']),
      TipoEmpresa: getColumnValue(row, ['TipoEmpresa', 'tipoEmpresa', 'TIPOEMPRESA', 'TipoEmpresa', 'Tipo_Empresa', 'Tipo Empresa'])
    }));

    console.log('Dados normalizados (primeiros 3):', JSON.stringify(data.slice(0, 3), null, 2));

    // Cria empresas baseadas na primeira palavra do contrato
    const companyNames = new Set();
    data.forEach(row => {
      const companyName = row.Contrato.toString().split(' ')[0];
      if (companyName) {
        companyNames.add(companyName);
      }
    });

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
    
    // Busca todas as empresas e posições criadas
    const allCompanies = await Company.findAll({ transaction });
    const allPositions = await Position.findAll({ transaction });
    const companyMap = new Map(allCompanies.map(c => [c.corporateName, c.id]));
    const positionMap = new Map(allPositions.map(p => [p.name, p.id]));

    // Cria contratos únicos
    const uniqueContracts = new Map();
    data.forEach(row => {
      const companyName = row.Contrato.toString().split(' ')[0];
      const companyId = companyMap.get(companyName);
      if (companyId && !uniqueContracts.has(row.Contrato)) {
        uniqueContracts.set(row.Contrato, { 
          name: row.Contrato, 
          contractNumber: row.Contrato, 
          companyId 
        });
      }
    });

    await Contract.bulkCreate(Array.from(uniqueContracts.values()), { 
      ignoreDuplicates: true, 
      transaction 
    });
    console.log(`- ${uniqueContracts.size} Contratos inseridos/verificados.`);

    // Busca todos os contratos criados
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

    await WorkLocation.bulkCreate(Array.from(uniqueWorkLocations.values()), { 
      ignoreDuplicates: true, 
      transaction 
    });
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
      return { companyId: parseInt(companyId), positionId: parseInt(positionId) };
    });

    await CompanyPosition.bulkCreate(companyPositionToCreate, { 
      ignoreDuplicates: true, 
      transaction 
    });
    console.log(`- ${companyPositionToCreate.length} associações Cliente-Categoria criadas.`);

    console.log('Seeding da estrutura do Excel concluído com sucesso.');

  } catch (error) {
    console.error('Erro durante o seeding do Excel:', error);
    throw error;
  }
};

module.exports = { seedFromExcel };