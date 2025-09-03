const { Employee, Position, WorkLocation, Contract } = require('../../models');
const { Op } = require('sequelize');

/**
 * Cria um novo colaborador no banco de dados.
 * Valida se as entidades relacionadas (cargo, local, contrato) existem.
 * @param {object} employeeData - Dados do colaborador.
 * @returns {Promise<Employee>} O colaborador criado.
 * @throws {Error} Se alguma entidade relacionada não for encontrada.
 */
const createEmployee = async (employeeData) => {
  const { positionId, workLocationId, contractId } = employeeData;

  const [position, workLocation, contract] = await Promise.all([
    Position.findByPk(positionId),
    WorkLocation.findByPk(workLocationId),
    Contract.findByPk(contractId)
  ]);

  if (!position || !workLocation || !contract) {
    throw new Error('Invalid Data: Position, Work Location, or Contract not found.');
  }

  const employee = await Employee.create(employeeData);
  return employee;
};

/**
 * Busca todos os colaboradores com filtros e paginação.
 * @param {object} filters - Opções de filtro (name, cpf, registration, etc.).
 * @returns {Promise<{total: number, employees: Array<Employee>, page: number, limit: number}>}
 */
const findAllEmployees = async (filters) => {
  const { name, cpf, registration, contractId, workLocationId, page = 1, limit = 10 } = filters;
  const where = {};

  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (cpf) where.cpf = { [Op.like]: `%${cpf}%` };
  if (registration) where.registration = { [Op.like]: `%${registration}%` };
  if (contractId) where.contractId = contractId;
  if (workLocationId) where.workLocationId = workLocationId;

  const offset = (page - 1) * limit;

  const { count, rows } = await Employee.findAndCountAll({
    where,
    limit,
    offset,
    order: [['name', 'ASC']],
    include: [
      { model: Position, as: 'position', attributes: ['id', 'name'] },
      { model: WorkLocation, as: 'workLocation', attributes: ['id', 'name'] },
      { model: Contract, as: 'contract', attributes: ['id', 'name'] },
    ]
  });

  return { total: count, employees: rows, page, limit };
};

/**
 * Busca um colaborador pelo seu ID.
 * @param {string} id - O ID do colaborador.
 * @returns {Promise<Employee|null>} O colaborador encontrado ou nulo.
 */
const findEmployeeById = async (id) => {
  const employee = await Employee.findByPk(id, {
    include: [
      { model: Position, as: 'position' },
      { model: WorkLocation, as: 'workLocation' },
      { model: Contract, as: 'contract' }
    ]
  });
  return employee;
};

/**
 * Atualiza os dados de um colaborador.
 * @param {string} id - O ID do colaborador a ser atualizado.
 * @param {object} updateData - Os dados a serem atualizados.
 * @returns {Promise<Employee|null>} O colaborador atualizado ou nulo se não encontrado.
 */
const updateEmployee = async (id, updateData) => {
  const employee = await Employee.findByPk(id);
  if (!employee) {
    return null;
  }
  await employee.update(updateData);
  return employee;
};

/**
 * Deleta um colaborador do banco de dados.
 * @param {string} id - O ID do colaborador a ser deletado.
 * @returns {Promise<boolean>} True se foi bem-sucedido, false caso contrário.
 */
const deleteEmployee = async (id) => {
  const employee = await Employee.findByPk(id);
  if (!employee) {
    return false;
  }
  await employee.destroy();
  return true;
};

/**
 * Realiza a importação de múltiplos colaboradores em lote.
 * Conforme a estrutura da planilha: CPF, Matricula, Nome, Local de Trabalho, Data Admissao, Contrato, Categoria
 * @param {Array<object>} employeesData - Array de objetos de colaboradores.
 * @returns {Promise<{successCount: number, errorCount: number, errors: Array<object>}>} Relatório da importação.
 */
const bulkImportEmployees = async (employeesData) => {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Usar `for...of` para permitir o uso de `await` dentro do loop.
    for (const employeeRecord of employeesData) {
        try {
            // A importação deve ser robusta, validando se CPF e Matrícula já existem.
            const existing = await Employee.findOne({
                where: {
                    [Op.or]: [
                        { cpf: employeeRecord.cpf },
                        { registration: employeeRecord.registration }
                    ]
                }
            });

            if (existing) {
                throw new Error(`CPF or Registration already exists for record: ${employeeRecord.name}`);
            }

            // A importação deve ser capaz de associar por nome, se IDs não forem fornecidos.
            // Esta é uma lógica complexa e aqui está uma versão simplificada.
            // Em um sistema real, seria necessário buscar IDs de contrato, local, etc.
            // Por simplicidade, vamos assumir que os IDs são fornecidos.
            await createEmployee(employeeRecord);
            successCount++;
        } catch (error) {
            errorCount++;
            errors.push({
                name: employeeRecord.name,
                cpf: employeeRecord.cpf,
                error: error.message
            });
        }
    }
    return { successCount, errorCount, errors };
};

/**
 * Busca TODOS os colaboradores que correspondem aos filtros, sem paginação.
 * @param {object} filters - Opções de filtro.
 * @returns {Promise<Array<Employee>>} Um array com todos os colaboradores encontrados.
 */
const exportAllEmployees = async (filters) => {
  // Removemos a paginação para exportar todos os resultados
  const { name, cpf, registration, contractId, workLocationId } = filters;
  const where = {};

  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (cpf) where.cpf = { [Op.like]: `%${cpf}%` };
  if (registration) where.registration = { [Op.like]: `%${registration}%` };
  if (contractId) where.contractId = contractId;
  if (workLocationId) where.workLocationId = workLocationId;

  const employees = await Employee.findAll({
    where,
    order: [['name', 'ASC']],
    include: [
      { model: Position, as: 'position', attributes: ['name'] },
      { model: WorkLocation, as: 'workLocation', attributes: ['name'] },
      { model: Contract, as: 'contract', attributes: ['name'] },
    ]
  });

  return employees;
};

/**
 * Busca TODAS as empresas que correspondem aos filtros, sem paginação.
 * @param {object} filters - Opções de filtro (tradeName, cnpj).
 * @returns {Promise<Array<Company>>} Um array com todas as empresas encontradas.
 */
const exportAllCompanies = async (filters) => {
  const { tradeName, cnpj } = filters;
  const where = {};

  if (tradeName) where.tradeName = { [Op.iLike]: `%${tradeName}%` };
  if (cnpj) where.cnpj = { [Op.like]: `%${cnpj}%` };

  const companies = await Company.findAll({
    where,
    order: [['tradeName', 'ASC']],
  });

  return companies;
};

module.exports = {
  createEmployee,
  findAllEmployees,
  findEmployeeById,
  updateEmployee,
  deleteEmployee,
  bulkImportEmployees,
  exportAllEmployees,
  exportAllCompanies
};