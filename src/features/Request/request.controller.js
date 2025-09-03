const requestService = require('./request.service');
const xlsxService = require('../../utils/xlsx.service');

const createAdmissionRequest = async (req, res) => {
  try {
    const solicitantId = req.userId; 
    const request = await requestService.createAdmissionRequest(req.body, solicitantId);
    return res.status(201).json(request);
  } catch (error) {
    if (error.message.startsWith('Permission Denied')) return res.status(403).json({ error: error.message });
    if (error.message.startsWith('Invalid Data')) return res.status(400).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const createResignationRequest = async (req, res) => {
  try {
    const solicitantId = req.userId;
    const request = await requestService.createResignationRequest(req.body, solicitantId);
    return res.status(201).json(request);
  } catch (error) {
    if (error.message.startsWith('Permission Denied')) return res.status(403).json({ error: error.message });
    if (error.message.startsWith('Invalid Data')) return res.status(400).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const userInfo = { id: req.userId, profile: req.userProfile };
    const requestsData = await requestService.findAllRequests(req.query, userInfo);
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

const analyzeRequest = async (req, res) => {
    try {
        const managerId = req.userId;
        const { id: requestId } = req.params;
        const { approved, notes } = req.body;

        if (approved === undefined) return res.status(400).json({ error: 'Field "approved" (boolean) is required.' });

        const updatedRequest = await requestService.analyzeRequestByManager(requestId, { approved, notes }, managerId);
        return res.status(200).json(updatedRequest);
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('Permission Denied')) return res.status(404).json({ error: error.message });
        if (error.message.startsWith('Cannot analyze request')) return res.status(409).json({ error: error.message });
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const updateStatusByRh = async (req, res) => {
    try {
        const rhUserId = req.userId;
        const { id: requestId } = req.params;
        const { status, notes } = req.body;

        if (!status) return res.status(400).json({ error: 'Field "status" is required.' });

        const updatedRequest = await requestService.updateRequestStatusByRh(requestId, { status, notes }, rhUserId);
        return res.status(200).json(updatedRequest);
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        if (error.message.startsWith('Invalid status transition')) return res.status(409).json({ error: error.message });
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
        if (error.message.startsWith('Cannot cancel a request')) {
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
        if (error.message.startsWith('Cannot resolve cancellation')) {
            return res.status(409).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const exportRequests = async (req, res) => {
    try {
        const userInfo = { id: req.userId, profile: req.userProfile };
        const requests = await requestService.exportAllRequests(req.query, userInfo);

        const formattedData = requests.map(req => ({
            'Protocolo': req.protocol,
            'Tipo': req.type,
            'Status': req.status,
            'Empresa Cliente': req.company ? req.company.tradeName : '',
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


// Adicione as novas funções ao objeto de exportação.
module.exports = {
  createAdmissionRequest,
  createResignationRequest,
  getAllRequests,
  getRequestById,
  analyzeRequest,
  updateStatusByRh,
  requestCancellation,
  resolveCancellation,
  exportRequests
};
