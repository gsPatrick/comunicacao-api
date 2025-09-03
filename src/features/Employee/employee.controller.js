const employeeService = require('./employee.service');
const xlsxService = require('../../utils/xlsx.service');

const createEmployee = async (req, res) => {
  try {
    const employee = await employeeService.createEmployee(req.body);
    return res.status(201).json(employee);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      return res.status(400).json({ error: `${field} already exists.` });
    }
    if (error.message.startsWith('Invalid Data')) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getAllEmployees = async (req, res) => {
  try {
    const employeesData = await employeeService.findAllEmployees(req.query);
    return res.status(200).json(employeesData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const employee = await employeeService.findEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    return res.status(200).json(employee);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const updatedEmployee = await employeeService.updateEmployee(req.params.id, req.body);
    if (!updatedEmployee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    return res.status(200).json(updatedEmployee);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      return res.status(400).json({ error: `${field} already exists.` });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const success = await employeeService.deleteEmployee(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const bulkImport = async (req, res) => {
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
        return res.status(400).json({ error: 'The request body must contain an "employees" array.' });
    }
    try {
        const report = await employeeService.bulkImportEmployees(employees);
        return res.status(200).json(report);
    } catch (error) {
        return res.status(500).json({ error: 'An unexpected error occurred during import.', details: error.message });
    }
};

const exportEmployees = async (req, res) => {
    try {
        const employees = await employeeService.exportAllEmployees(req.query);

        // Formata os dados para um formato plano e amigável para a planilha
        const formattedData = employees.map(emp => ({
            'Nome Completo': emp.name,
            'CPF': emp.cpf,
            'Matrícula': emp.registration,
            'Data de Admissão': emp.admissionDate,
            'Categoria': emp.category,
            'Cargo': emp.position ? emp.position.name : '',
            'Contrato': emp.contract ? emp.contract.name : '',
            'Local de Trabalho': emp.workLocation ? emp.workLocation.name : '',
        }));

        const buffer = xlsxService.jsonToXlsxBuffer(formattedData);
        const filename = `colaboradores-${new Date().toISOString().slice(0,10)}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ error: 'Failed to export data.', details: error.message });
    }
};


const exportCompanies = async (req, res) => {
    try {
        const companies = await companyService.exportAllCompanies(req.query);

        const formattedData = companies.map(company => ({
            'ID': company.id,
            'Razão Social': company.corporateName,
            'Nome Fantasia': company.tradeName,
            'CNPJ': company.cnpj,
            'Endereço': company.address,
            'Data de Criação': company.createdAt,
        }));

        const buffer = xlsxService.jsonToXlsxBuffer(formattedData);
        const filename = `empresas-clientes-${new Date().toISOString().slice(0,10)}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ error: 'Failed to export company data.', details: error.message });
    }
};

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  bulkImport,
  exportEmployees,
  exportCompanies
};