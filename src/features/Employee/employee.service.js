const { Employee, Position, WorkLocation, Contract, UserCompany, Company, UserPermission, Permission } = require('../../models'); // Adicionado UserPermission
const { Op } = require('sequelize');

/**
 * Função auxiliar para buscar os IDs de contrato permitidos para um usuário.
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<Array<string>|null>} Um array de IDs de contrato ou null se o acesso for global.
 */
const getAllowedContractIds = async (userId) => {
    const permissions = await UserPermission.findAll({
        where: {
            userId,
            permissionKey: 'employees:read', // A permissão para ler colaboradores
            scopeType: 'CONTRACT'
        },
        attributes: ['scopeId']
    });

    return permissions.map(p => p.scopeId);
};


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
 * Busca todos os colaboradores com filtros e paginação, aplicando regras de permissão por escopo.
 * @param {object} filters - Opções de filtro (name, cpf, registration, etc.).
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<{total: number, employees: Array<Employee>, page: number, limit: number}>}
 */
const findAllEmployees = async (filters, userInfo) => {
  const { name, cpf, registration, contractId, workLocationId, page = 1, limit = 10, all = false } = filters;
  const { id: userId, profile } = userInfo;
  const where = {};

  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (cpf) where.cpf = { [Op.like]: `%${cpf}%` };
  if (registration) where.registration = { [Op.like]: `%${registration}%` };
  if (contractId) where.contractId = contractId;
  if (workLocationId) where.workLocationId = workLocationId;

  // --- NOVA LÓGICA DE ESCOPO ---
  if (profile !== 'ADMIN') {
    const accessibleContractIds = await getAllowedContractIds(userId);
    
    // Se o usuário não tem escopos definidos para esta permissão, ele não pode ver ninguém.
    if (accessibleContractIds.length === 0) {
        return { total: 0, employees: [], page: 1, limit: 0 };
    }

    // Adiciona o filtro de escopo à cláusula 'where' principal.
    // Se o usuário já filtrou por um contrato, garante que ele só possa ver aquele se tiver permissão.
    if (where.contractId) {
        if (!accessibleContractIds.includes(where.contractId)) {
            // O usuário está tentando filtrar um contrato ao qual não tem acesso.
            return { total: 0, employees: [], page: 1, limit: 0 };
        }
    } else {
        where.contractId = { [Op.in]: accessibleContractIds };
    }
  }
  // --- FIM DA NOVA LÓGICA ---
  
  const queryOptions = {
    where,
    order: [['name', 'ASC']],
    include: [
      { model: Position, as: 'position', attributes: ['id', 'name'] },
      { model: WorkLocation, as: 'workLocation', attributes: ['id', 'name'] },
      { model: Contract, as: 'contract', attributes: ['id', 'name'] },
    ]
  };

  if (!all) {
    queryOptions.limit = parseInt(limit, 10);
    queryOptions.offset = (parseInt(page, 10) - 1) * queryOptions.limit;
  }

  const { count, rows } = await Employee.findAndCountAll(queryOptions);
  return { total: count, employees: rows, page: all ? 1 : page, limit: all ? count : limit };
};

/**
 * Busca um colaborador pelo seu ID, validando o escopo de acesso.
 * @param {string} id - O ID do colaborador.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<Employee|null>} O colaborador encontrado ou nulo.
 */
const findEmployeeById = async (id, userInfo) => {
  const employee = await Employee.findByPk(id, {
    include: [
      { model: Position, as: 'position' },
      { model: WorkLocation, as: 'workLocation' },
      { model: Contract, as: 'contract' }
    ]
  });

  if (!employee) return null;

  // Validação de escopo
  if (userInfo.profile !== 'ADMIN') {
    const accessibleContractIds = await getAllowedContractIds(userInfo.id);
    if (!accessibleContractIds.includes(employee.contractId)) {
        return null; // Usuário não tem permissão para este contrato
    }
  }

  return employee;
};

/**
 * Atualiza os dados de um colaborador, validando o escopo de acesso.
 * @param {string} id - O ID do colaborador a ser atualizado.
 * @param {object} updateData - Os dados a serem atualizados.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<Employee|null>} O colaborador atualizado ou nulo se não encontrado/permitido.
 */
const updateEmployee = async (id, updateData, userInfo) => {
  const employee = await Employee.findByPk(id);
  if (!employee) {
    return null;
  }

  // Validação de escopo para escrita
  if (userInfo.profile !== 'ADMIN') {
     const permissions = await UserPermission.findAll({
        where: { userId: userInfo.id, permissionKey: 'employees:write', scopeType: 'CONTRACT' },
        attributes: ['scopeId']
    });
    const writableContractIds = permissions.map(p => p.scopeId);
    if (!writableContractIds.includes(employee.contractId)) {
        throw new Error('Access Denied: You do not have permission to modify employees in this contract.');
    }
  }

  await employee.update(updateData);
  return employee;
};

/**
 * Deleta um colaborador do banco de dados, validando o escopo de acesso.
 * @param {string} id - O ID do colaborador a ser deletado.
 * @param {object} userInfo - Informações do usuário logado ({ id, profile }).
 * @returns {Promise<boolean>} True se foi bem-sucedido, false caso contrário.
 */
const deleteEmployee = async (id, userInfo) => {
  const employee = await Employee.findByPk(id);
  if (!employee) {
    return false;
  }

  // Validação de escopo para escrita (delete)
  if (userInfo.profile !== 'ADMIN') {
     const permissions = await UserPermission.findAll({
        where: { userId: userInfo.id, permissionKey: 'employees:write', scopeType: 'CONTRACT' },
        attributes: ['scopeId']
    });
    const writableContractIds = permissions.map(p => p.scopeId);
    if (!writableContractIds.includes(employee.contractId)) {
        throw new Error('Access Denied: You do not have permission to delete employees in this contract.');
    }
  }

  await employee.destroy();
  return true;
};

/**
 * Realiza a importação de múltiplos colaboradores em lote.
 * @param {Array<object>} employeesData - Array de objetos de colaboradores.
 * @returns {Promise<{successCount: number, errorCount: number, errors: Array<object>}>} Relatório da importação.
 */
const bulkImportEmployees = async (employeesData) => {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const employeeRecord of employeesData) {
        try {
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
 * Busca TODOS os colaboradores que correspondem aos filtros, sem paginação, para exportação.
 * @param {object} filters - Opções de filtro.
 * @param {object} userInfo - Informações do usuário logado.
 * @returns {Promise<Array<Employee>>} Um array com todos os colaboradores encontrados.
 */
const exportAllEmployees = async (filters, userInfo) => {
  const { name, cpf, registration, contractId, workLocationId } = filters;
  const { id: userId, profile } = userInfo;
  const where = {};

  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (cpf) where.cpf = { [Op.like]: `%${cpf}%` };
  if (registration) where.registration = { [Op.like]: `%${registration}%` };
  if (contractId) where.contractId = contractId;
  if (workLocationId) where.workLocationId = workLocationId;
  
  // --- NOVA LÓGICA DE ESCOPO (IDÊNTICA A findAllEmployees) ---
  if (profile !== 'ADMIN') {
    const accessibleContractIds = await getAllowedContractIds(userId);
    if (accessibleContractIds.length === 0) {
        return [];
    }
    if (where.contractId) {
        if (!accessibleContractIds.includes(where.contractId)) return [];
    } else {
        where.contractId = { [Op.in]: accessibleContractIds };
    }
  }
  // --- FIM DA NOVA LÓGICA ---

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

module.exports = {
  createEmployee,
  findAllEmployees,
  findEmployeeById,
  updateEmployee,
  deleteEmployee,
  bulkImportEmployees,
  exportAllEmployees,
};