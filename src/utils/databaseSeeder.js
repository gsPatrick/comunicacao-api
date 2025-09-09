const path = require('path');
const xlsx = require('xlsx');
const { Company, Contract, Position, WorkLocation, CompanyPosition } = require('../models');

const filePath = path.join(__dirname, '../scripts/database_structure.xlsx');

const seedFromExcel = async ({ transaction }) => {
  console.log('Iniciando seeding da estrutura a partir do Excel (Versão Final Robusta)...');

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`- Processando planilha: ${sheetName}`);
    console.log(`- Range da planilha: ${worksheet['!ref']}`);
    
    // Lê usando método robusto: pega arrays de cada linha
    const rows = xlsx.utils.sheet_to_json(worksheet, { 
      header: 1, // Usa índices numéricos como headers (0, 1, 2, 3...)
      range: 2,  // Pula as 2 primeiras linhas (título e header)
      defval: null, // Valor padrão para células vazias
      raw: false // Converte valores para string
    });

    console.log(`- Total de linhas brutas lidas: ${rows.length}`);

    // Processa e limpa os dados
    const data = rows
      .map((row, index) => {
        if (!row || row.length < 3) return null;
        
        const item = {
          Contrato: row[0] ? String(row[0]).trim() : null,
          Categoria: row[1] ? String(row[1]).trim() : null,
          Loc_Trabalho: row[2] ? String(row[2]).trim() : null,
          TipoEmpresa: row[3] ? String(row[3]).trim() : null,
          _linha: index + 3 // Para debug (linha real no Excel)
        };

        // Log a cada 1000 registros para acompanhar progresso
        if (index > 0 && index % 1000 === 0) {
          console.log(`  - Processando linha ${index}...`);
        }

        return item;
      })
      .filter((row, index) => {
        if (!row) return false;
        
        const isValid = row.Contrato && row.Categoria && row.Loc_Trabalho;
        
        if (!isValid && index < 10) {
          // Log apenas das primeiras 10 linhas inválidas para debug
          console.log(`  - Linha ${row._linha} rejeitada:`, {
            contrato: row.Contrato || 'VAZIO',
            categoria: row.Categoria || 'VAZIO',
            locTrabalho: row.Loc_Trabalho || 'VAZIO'
          });
        }
        
        return isValid;
      });

    console.log(`- Registros válidos após limpeza: ${data.length}`);
    
    if (data.length === 0) {
      console.warn('- ERRO: Nenhum dado válido encontrado!');
      return;
    }

    // Mostra amostra dos dados processados
    console.log('- Amostra dos primeiros 3 registros:', JSON.stringify(data.slice(0, 3).map(r => ({
      Contrato: r.Contrato,
      Categoria: r.Categoria,
      Loc_Trabalho: r.Loc_Trabalho
    })), null, 2));

    // 1. EMPRESAS - extrai nomes únicos das empresas
    console.log('\n=== PROCESSANDO EMPRESAS ===');
    const companyNames = new Set();
    data.forEach(row => {
      const companyName = row.Contrato.split(' ')[0];
      if (companyName && companyName.length > 1) {
        companyNames.add(companyName);
      }
    });

    const companiesToCreate = Array.from(companyNames).map(name => ({
      corporateName: name,
      tradeName: name,
      cnpj: `${String(Math.floor(10 + Math.random() * 90)).padStart(2, '0')}.${String(Math.floor(100 + Math.random() * 900)).padStart(3, '0')}.${String(Math.floor(100 + Math.random() * 900)).padStart(3, '0')}/0001-${String(Math.floor(10 + Math.random() * 90)).padStart(2, '0')}`,
    }));

    await Company.bulkCreate(companiesToCreate, { 
      ignoreDuplicates: true, 
      transaction,
      validate: true
    });
    console.log(`- ${companiesToCreate.length} empresas únicas inseridas/verificadas.`);

    // 2. POSIÇÕES - extrai categorias únicas
    console.log('\n=== PROCESSANDO POSIÇÕES ===');
    const positionNames = new Set(data.map(row => row.Categoria));
    const positionsToCreate = Array.from(positionNames).map(name => ({ 
      name,
      description: `Posição: ${name}`
    }));
    
    await Position.bulkCreate(positionsToCreate, { 
      ignoreDuplicates: true, 
      transaction,
      validate: true
    });
    console.log(`- ${positionsToCreate.length} posições únicas inseridas/verificadas.`);
    
    // 3. Busca dados criados para relacionamentos
    console.log('\n=== CRIANDO MAPEAMENTOS ===');
    const allCompanies = await Company.findAll({ transaction });
    const allPositions = await Position.findAll({ transaction });
    const companyMap = new Map(allCompanies.map(c => [c.corporateName, c.id]));
    const positionMap = new Map(allPositions.map(p => [p.name, p.id]));
    
    console.log(`- ${allCompanies.length} empresas mapeadas`);
    console.log(`- ${allPositions.length} posições mapeadas`);

    // 4. CONTRATOS - cria contratos únicos
    console.log('\n=== PROCESSANDO CONTRATOS ===');
    const uniqueContracts = new Map();
    let contractsProcessed = 0;
    
    data.forEach(row => {
      const companyName = row.Contrato.split(' ')[0];
      const companyId = companyMap.get(companyName);
      
      if (companyId && !uniqueContracts.has(row.Contrato)) {
        uniqueContracts.set(row.Contrato, { 
          name: row.Contrato, 
          contractNumber: row.Contrato, 
          companyId 
        });
        contractsProcessed++;
      }
    });

    const contractsArray = Array.from(uniqueContracts.values());
    await Contract.bulkCreate(contractsArray, { 
      ignoreDuplicates: true, 
      transaction,
      validate: true
    });
    console.log(`- ${contractsArray.length} contratos únicos inseridos/verificados.`);

    // 5. LOCAIS DE TRABALHO
    console.log('\n=== PROCESSANDO LOCAIS DE TRABALHO ===');
    const allContracts = await Contract.findAll({ transaction });
    const contractMap = new Map(allContracts.map(c => [c.name, c.id]));
    
    const uniqueWorkLocations = new Map();
    let locationsProcessed = 0;
    
    data.forEach(row => {
      const contractId = contractMap.get(row.Contrato);
      const locationName = row.Loc_Trabalho;
      const uniqueKey = `${contractId}::${locationName}`;
      
      if (contractId && locationName && !uniqueWorkLocations.has(uniqueKey)) {
        uniqueWorkLocations.set(uniqueKey, { 
          name: locationName, 
          contractId 
        });
        locationsProcessed++;
      }
    });

    const locationsArray = Array.from(uniqueWorkLocations.values());
    await WorkLocation.bulkCreate(locationsArray, { 
      ignoreDuplicates: true, 
      transaction,
      validate: true
    });
    console.log(`- ${locationsArray.length} locais de trabalho únicos inseridos/verificados.`);

    // 6. ASSOCIAÇÕES EMPRESA-POSIÇÃO
    console.log('\n=== PROCESSANDO ASSOCIAÇÕES EMPRESA-POSIÇÃO ===');
    const uniqueCompanyPosition = new Set();
    let associationsProcessed = 0;
    
    data.forEach(row => {
      const companyId = companyMap.get(row.Contrato.split(' ')[0]);
      const positionId = positionMap.get(row.Categoria);
      
      if (companyId && positionId) {
        const key = `${companyId}::${positionId}`;
        if (!uniqueCompanyPosition.has(key)) {
          uniqueCompanyPosition.add(key);
          associationsProcessed++;
        }
      }
    });

    const companyPositionToCreate = Array.from(uniqueCompanyPosition).map(pair => {
      const [companyId, positionId] = pair.split('::');
      return { 
        companyId: parseInt(companyId), 
        positionId: parseInt(positionId) 
      };
    });
    
    await CompanyPosition.bulkCreate(companyPositionToCreate, { 
      ignoreDuplicates: true, 
      transaction,
      validate: true
    });
    console.log(`- ${companyPositionToCreate.length} associações empresa-posição criadas.`);

    // RESUMO FINAL
    console.log('\n=== RESUMO FINAL ===');
    console.log(`✅ Processamento concluído com sucesso!`);
    console.log(`- ${data.length} registros processados do Excel`);
    console.log(`- ${companiesToCreate.length} empresas`);
    console.log(`- ${positionsToCreate.length} posições/categorias`);
    console.log(`- ${contractsArray.length} contratos`);
    console.log(`- ${locationsArray.length} locais de trabalho`);
    console.log(`- ${companyPositionToCreate.length} associações empresa-posição`);
    
  } catch (error) {
    console.error('\n❌ ERRO durante o seeding do Excel:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

module.exports = { seedFromExcel };