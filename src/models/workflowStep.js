'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WorkflowStep extends Model {
    static associate(models) {
      this.belongsTo(models.Workflow, { foreignKey: 'workflowId', as: 'workflow' });
      this.belongsTo(models.Step, { foreignKey: 'stepId', as: 'step' });
    }
  }
  WorkflowStep.init({
    workflowId: {
      type: DataTypes.UUID,
      references: { model: 'workflows', key: 'id' }, // CORRIGIDO: 'Workflows' para 'workflows'
      primaryKey: true, 
    },
    stepId: {
      type: DataTypes.UUID,
      references: { model: 'steps', key: 'id' }, // CORRIGIDO: 'Steps' para 'steps'
      primaryKey: true,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    profileOverride: {
      type: DataTypes.ENUM('ADMIN', 'RH', 'GESTAO', 'SOLICITANTE'),
      allowNull: true,
    },
    allowedNextStepIds: {
      type: DataTypes.JSONB, 
      allowNull: true,
      defaultValue: [],
    },
  }, {
    sequelize,
    modelName: 'WorkflowStep',
    tableName: 'workflow_steps', // Nome explícito da tabela
    indexes: [
      {
        unique: true,
        fields: ['workflow_id', 'order'], 
        name: 'workflow_steps_workflow_id_order_unique',
      },
    ],
  });
  return WorkflowStep;
};