'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Workflow extends Model {
    static associate(models) {
      // Um fluxo pode ter várias solicitações
      this.hasMany(models.Request, { foreignKey: 'workflowId', as: 'requests' });
      // Um fluxo tem muitas etapas através de WorkflowSteps
      this.belongsToMany(models.Step, { through: 'WorkflowStep', foreignKey: 'workflowId', as: 'steps' });
      this.hasMany(models.WorkflowStep, { foreignKey: 'workflowId', as: 'workflowSteps' });
    }
  }
  Workflow.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'Workflow',
    tableName: 'Workflows', // Explicitly define table name
  });
  return Workflow;
};