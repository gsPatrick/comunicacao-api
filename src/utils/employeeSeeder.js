// src/utils/employeeSeeder.js

const path = require('path');
const xlsx = require('xlsx');
const { Employee, Contract, Position, WorkLocation } = require('../models');

// ATENÇÃO: Coloque o nome exato do seu novo arquivo Excel aqui.
const filePath = path.join(__dirname, '../scripts/funcionario.xlsx');

/**
 * Converte uma data no formato DD/MM/AAAA para um objeto Date do JavaScript.
 * @param {string} dateString - A data em formato de texto.
 * @returns {Date|null} O objeto Date ou nulo se o formato for inválido.
 */
const parseDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.split('/');
  if (parts.length === 3) {
    // new Date(ano, mês - 1, dia)
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return null;
};

/**
 * Popula a tabela de Employees a partir da planilha de funcionários.
 * @param {object} options - Opções, incluindo a transação.
 * @param {import('sequelize').Transaction} options.transaction - A transação do Sequelize.
 */
const seedEmployees = async ({ transaction }) => {
  console.log('Iniciando seeding de Funcionários (Employees) a partir do Excel...');

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Lê a planilha a partir da linha 2 (índice 1), usando os cabeçalhos definidos manualmente
    const rows = xlsx.utils.sheet_to_json(worksheet, {
      range: 1, // Pula a linha 1 do Excel (cabeçalho original)
      header: ['CPF', 'Matricula', 'Nome_do_Funcionario', 'Loc_Trabalho', 'Data_Admissao', 'Contrato', 'Categoria'],
    });
    
    console.log(`- Encontrados ${rows.length} registros de funcionários na planilha.`);

    // ETAPA 1: Buscar e mapear as entidades existentes no banco de dados
    const [allContracts, allPositions, allWorkLocations] = await Promise.all([
        Contract.findAll({ transaction }),
        Position.findAll({ transaction }),
        WorkLocation.findAll({ transaction }),
    ]);

    const contractMap = new Map(allContracts.map(c => [c.name, c.id]));
    const positionMap = new Map(allPositions.map(p => [p.name, p.id]));
    
    // O mapeamento de WorkLocation precisa ser mais inteligente, pois um mesmo nome
    // de local pode existir em contratos diferentes. A chave será "contractId-locationName".
    const workLocationMap = new Map(allWorkLocations.map(wl => [`${wl.contractId}-${wl.name}`, wl.id]));
    
    console.log('- Mapeamento de Contratos, Categorias e Locais de Trabalho concluído.');

    // ETAPA 2: Processar cada linha da planilha e preparar para inserção
    const employeesToCreate = [];
    const errors = [];

    for (const row of rows) {
        // Validação básica
        if (!row.CPF || !row.Matricula || !row.Nome_do_Funcionario) {
            errors.push({ matricula: row.Matricula, erro: 'CPF, Matrícula ou Nome ausentes.' });
            continue;
        }

        // Busca os IDs das entidades relacionadas
        const contractId = contractMap.get(row.Contrato);
        const positionId = positionMap.get(row.Categoria);
        
        // Busca o workLocationId usando a chave composta
        const workLocationKey = `${contractId}-${row.Loc_Trabalho}`;
        const workLocationId = workLocationMap.get(workLocationKey);

        // Valida se as entidades foram encontradas. Se não, o funcionário não pode ser criado.
        if (!contractId || !positionId || !workLocationId) {
            errors.push({ matricula: row.Matricula, nome: row.Nome_do_Funcionario, erro: `Não foi possível encontrar Contrato, Categoria ou Local de Trabalho correspondente no banco. [Contrato: ${row.Contrato}, Categoria: ${row.Categoria}, Local: ${row.Loc_Trabalho}]` });
            continue;
        }
        
        const admissionDate = parseDate(row.Data_Admissao);
        if (!admissionDate) {
            errors.push({ matricula: row.Matricula, nome: row.Nome_do_Funcionario, erro: `Data de admissão inválida: ${row.Data_Admissao}` });
            continue;
        }

        employeesToCreate.push({
            cpf: String(row.CPF).trim(),
            registration: String(row.Matricula).trim(),
            name: row.Nome_do_Funcionario.trim(),
            admissionDate: admissionDate,
            category: row.Categoria.trim(), // Campo original da planilha
            // Chaves estrangeiras
            positionId,
            workLocationId,
            contractId,
        });
    }

    if (errors.length > 0) {
        console.warn(`- AVISO: ${errors.length} funcionários não puderam ser processados. Verifique os logs abaixo:`);
        // Mostra os primeiros 10 erros para não poluir o console
        console.warn(errors.slice(0, 10));
    }

    // ETAPA 3: Inserir os funcionários válidos no banco de dados
    if (employeesToCreate.length > 0) {
        await Employee.bulkCreate(employeesToCreate, {
            transaction,
            ignoreDuplicates: true, // Ignora se já existir um funcionário com mesmo CPF ou Matrícula
        });
        console.log(`- ${employeesToCreate.length} funcionários inseridos/verificados com sucesso.`);
    } else {
        console.log('- Nenhum novo funcionário para inserir.');
    }

    console.log('Seeding de Funcionários concluído.');

  } catch (error) {
    console.error('Erro durante o seeding de funcionários:', error);
    throw error;
  }
};

module.exports = { seedEmployees };