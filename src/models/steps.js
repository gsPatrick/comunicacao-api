'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Step extends Model {
    static associate(models) {
      // Uma etapa pode estar em vários Workflows através de WorkflowSteps
      this.belongsToMany(models.Workflow, { through: 'WorkflowStep', foreignKey: 'stepId', as: 'workflows' });
    }
  }
  Step.init({
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
    defaultProfile: {
      type: DataTypes.ENUM('ADMIN', 'RH', 'GESTAO', 'SOLICITANTE'),
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Step',
    tableName: 'Steps', // Explicitly define table name
  });
  return Step;
};