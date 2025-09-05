const requestService = require('./request.service');
const xlsxService = require('../../utils/xlsx.service');

// As funções createAdmissionRequest e createResignationRequest serão simplificadas
// para chamar a função genérica createRequest no service, passando o nome do workflow.

const createAdmissionRequest = async (req, res) => {
  try {
    const solicitantId = req.userId; 
    const request = await requestService.createRequest('ADMISSAO', req.body, solicitantId); // Passa o nome do workflow
    return res.status(201).json(request);
  } catch (error) {
    if (error.message.startsWith('Permission Denied')) return res.status(403).json({ error: error.message });
    if (error.message.startsWith('Invalid Data')) return res.status(400).json({ error: error.message });
    if (error.message.includes('Workflow not properly configured')) return res.status(500).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const createResignationRequest = async (req, res) => {
  try {
    const solicitantId = req.userId;
    // Assume que o corpo da requisição pode conter um campo 'workflowName' para diferenciar Desligamento/Substituição
    // OU que teremos rotas separadas se o fluxo for muito diferente.
    // Pelo PDF, 'DESLIGAMENTO' e 'SUBSTITUICAO' são fluxos distintos.
    const workflowName = req.body.workflowName ? req.body.workflowName.toUpperCase() : 'DESLIGAMENTO'; // Padrão DESLIGAMENTO
    if (!['DESLIGAMENTO', 'SUBSTITUICAO'].includes(workflowName)) {
      return res.status(400).json({ error: 'Invalid workflowName for resignation/substitution request.' });
    }
    const request = await requestService.createRequest(workflowName, req.body, solicitantId);
    return res.status(201).json(request);
  } catch (error) {
    if (error.message.startsWith('Permission Denied')) return res.status(403).json({ error: error.message });
    if (error.message.startsWith('Invalid Data')) return res.status(400).json({ error: error.message });
    if (error.message.includes('Workflow not properly configured')) return res.status(500).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile };
    const requestsData = await requestService.findAllRequests(req.query, userInfo); // Passa req.query e userInfo
    return res.status(200).json(requestsData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getRequestById = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile };
    const request = await requestService.findRequestById(req.params.id, userInfo);
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    return res.status(200).json(request);
  } catch (error) {
    if (error.message === 'Access Denied') return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Nova função para atualizar o status (substitui analyzeRequest e updateStatusByRh)
const updateRequestStatus = async (req, res) => {
    try {
        const { id: requestId } = req.params;
        const { newStepName, notes } = req.body; // newStepName é o nome da nova etapa (status)

        if (!newStepName) {
            return res.status(400).json({ error: 'Field "newStepName" is required.' });
        }

        const updatedRequest = await requestService.updateRequestStatus(requestId, newStepName, req.userId, notes);
        return res.status(200).json(updatedRequest);
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        if (error.message.startsWith('Invalid status transition') || error.message.startsWith('Permission Denied')) return res.status(409).json({ error: error.message }); // 409 Conflict para transições inválidas, 403 para permissões
        if (error.message.startsWith('Workflow configuration for') || error.message.includes('not found in system configuration')) return res.status(500).json({ error: error.message }); // Erro de configuração do workflow
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const requestCancellation = async (req, res) => {
    try {
        const solicitantId = req.userId;
        const { id: requestId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Field "reason" is required.' });
        }

        const updatedRequest = await requestService.requestCancellation(requestId, solicitantId, reason);
        return res.status(200).json(updatedRequest);
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('Permission Denied')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.startsWith('Cannot cancel a request') || error.message.includes('workflow step "CANCELAMENTO_SOLICITADO" not found')) {
            return res.status(409).json({ error: error.message }); // 409 Conflict
        }
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const resolveCancellation = async (req, res) => {
    try {
        const managerId = req.userId;
        const { id: requestId } = req.params;
        const { approved, notes } = req.body;

        if (approved === undefined) {
            return res.status(400).json({ error: 'Field "approved" (boolean) is required.' });
        }

        const updatedRequest = await requestService.resolveCancellation(requestId, managerId, approved, notes);
        return res.status(200).json(updatedRequest);
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('Permission Denied')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.startsWith('Cannot resolve cancellation') || error.message.includes('workflow step "CANCELADO" not found')) {
            return res.status(409).json({ error: error.message });
        }
        if (error.message.includes('Could not determine the previous status')) {
            return res.status(500).json({ error: 'Internal server error: ' + error.message });
        }
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const exportRequests = async (req, res) => {
    try {
        const userInfo = { id: req.userId, profile: req.userProfile };
        const requests = await requestService.exportAllRequests(req.query, userInfo); // Passa req.query e userInfo

        const formattedData = requests.map(req => ({
            'Protocolo': req.protocol,
            'Tipo de Workflow': req.workflow ? req.workflow.name : '', // Agora é workflow.name
            'Status': req.status,
            'Empresa Cliente': req.company ? req.company.tradeName : '',
            'Contrato': req.contract ? req.contract.name : '', // NOVO CAMPO
            'Solicitante': req.solicitant ? req.solicitant.name : '',
            'Data Criação': req.createdAt,
            'Nome Candidato/Funcionário': req.candidateName || (req.employee ? req.employee.name : ''),
            'Cargo Solicitado': req.position ? req.position.name : '',
        }));
        
        const buffer = xlsxService.jsonToXlsxBuffer(formattedData);
        const filename = `solicitacoes-${new Date().toISOString().slice(0,10)}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ error: 'Failed to export data.', details: error.message });
    }
};

module.exports = {
  createAdmissionRequest,
  createResignationRequest,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  requestCancellation, 
  resolveCancellation,
  exportRequests
};