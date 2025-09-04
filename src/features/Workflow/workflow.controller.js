const workflowService = require('./workflow.service');

const getAllWorkflows = async (req, res) => {
  try {
    const workflows = await workflowService.findAllWorkflows();
    return res.status(200).json(workflows);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getWorkflowById = async (req, res) => {
  try {
    const workflow = await workflowService.findWorkflowById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found.' });
    }
    return res.status(200).json(workflow);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const updateWorkflowSteps = async (req, res) => {
  try {
    const { id: workflowId } = req.params;
    const workflowStepsData = req.body;

    if (!Array.isArray(workflowStepsData)) {
      return res.status(400).json({ error: 'Request body must be an array of workflow step configurations.' });
    }

    // Validação básica para cada item do array
    for (const stepConfig of workflowStepsData) {
      if (!stepConfig.stepId || !stepConfig.order) {
        return res.status(400).json({ error: 'Each workflow step configuration must include "stepId" and "order".' });
      }
      if (stepConfig.allowedNextStepIds && !Array.isArray(stepConfig.allowedNextStepIds)) {
        return res.status(400).json({ error: '"allowedNextStepIds" must be an array.' });
      }
    }

    await workflowService.updateWorkflowSteps(workflowId, workflowStepsData);
    return res.status(200).json({ message: 'Workflow steps updated successfully.' });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.name === 'SequelizeUniqueConstraintError' && error.message.includes('workflow_order_unique')) {
        return res.status(400).json({ error: 'Duplicate order detected for steps within this workflow.' });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

module.exports = {
  getAllWorkflows,
  getWorkflowById,
  updateWorkflowSteps,
};