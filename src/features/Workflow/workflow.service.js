const { Workflow, Step, WorkflowStep, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * Busca todos os fluxos de trabalho.
 * @returns {Promise<Array<Workflow>>} Um array de fluxos de trabalho.
 */
const findAllWorkflows = async () => {
  const workflows = await Workflow.findAll({
    order: [['name', 'ASC']],
  });
  return workflows;
};

/**
 * Busca um fluxo de trabalho pelo seu ID, incluindo todas as suas etapas configuradas.
 * @param {string} id - O ID do fluxo de trabalho.
 * @returns {Promise<Workflow|null>} O fluxo encontrado ou nulo, incluindo suas etapas.
 */
const findWorkflowById = async (id) => {
  const workflow = await Workflow.findByPk(id, {
    include: [{
      model: WorkflowStep,
      as: 'workflowSteps',
      include: [{
        model: Step,
        as: 'step',
        attributes: ['id', 'name', 'description', 'defaultProfile']
      }],
      attributes: ['order', 'profileOverride', 'allowedNextStepIds'],
    }],
    order: [[{ model: WorkflowStep, as: 'workflowSteps' }, 'order', 'ASC']],
  });
  return workflow;
};

/**
 * Atualiza a configuração de etapas para um fluxo de trabalho.
 * Remove todas as associações existentes e cria as novas.
 * @param {string} workflowId - O ID do fluxo de trabalho.
 * @param {Array<object>} workflowStepsData - Array de objetos de etapas para o fluxo.
 * @returns {Promise<boolean>} True se a operação foi bem-sucedida.
 * @throws {Error} Se o workflow ou alguma etapa não for encontrada.
 */
const updateWorkflowSteps = async (workflowId, workflowStepsData) => {
  const workflow = await Workflow.findByPk(workflowId);
  if (!workflow) {
    throw new Error('Workflow not found.');
  }

  // Validar se todas as stepIds existem
  const stepIds = workflowStepsData.map(ws => ws.stepId);
  const existingSteps = await Step.findAll({ where: { id: { [Op.in]: stepIds } } });
  if (existingSteps.length !== stepIds.length) {
    throw new Error('One or more steps not found.');
  }

  const transaction = await sequelize.transaction();
  try {
    // Remover todas as etapas existentes para este workflow
    await WorkflowStep.destroy({
      where: { workflowId },
      transaction,
    });

    // Criar novas associações WorkflowStep
    const newWorkflowSteps = workflowStepsData.map(ws => ({
      workflowId,
      stepId: ws.stepId,
      order: ws.order,
      profileOverride: ws.profileOverride,
      allowedNextStepIds: ws.allowedNextStepIds,
    }));

    await WorkflowStep.bulkCreate(newWorkflowSteps, { transaction });

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  findAllWorkflows,
  findWorkflowById,
  updateWorkflowSteps,
};