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
      references: { model: 'Workflows', key: 'id' },
      primaryKey: true, // Parte da chave primária composta
    },
    stepId: {
      type: DataTypes.UUID,
      references: { model: 'Steps', key: 'id' },
      primaryKey: true, // Parte da chave primária composta
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'workflow_order_unique', // Garante que a ordem seja única para cada workflow
    },
    profileOverride: {
      type: DataTypes.ENUM('ADMIN', 'RH', 'GESTAO', 'SOLICITANTE'),
      allowNull: true, // Opcional
    },
    allowedNextStepIds: {
      type: DataTypes.JSONB, // Usando JSONB para array de UUIDs
      allowNull: true, // Opcional
      defaultValue: [],
      get() {
        const rawValue = this.getDataValue('allowedNextStepIds');
        return rawValue ? (Array.isArray(rawValue) ? rawValue : JSON.parse(rawValue)) : [];
      },
      set(value) {
        this.setDataValue('allowedNextStepIds', JSON.stringify(value));
      },
    },
  }, {
    sequelize,
    modelName: 'WorkflowStep',
    tableName: 'WorkflowSteps',
    // Adicionar índice para garantir unicidade da ordem dentro do fluxo
    indexes: [
      {
        unique: true,
        fields: ['workflowId', 'order'],
      },
    ],
  });
  return WorkflowStep;
};