'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Request extends Model {
    static associate(models) {
      // Uma solicitação é criada por um usuário (Solicitante)
      this.belongsTo(models.User, { foreignKey: 'solicitantId', as: 'solicitant' });
      // Uma solicitação pertence a uma empresa/cliente
      this.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      // Uma solicitação está vinculada a um contrato
      this.belongsTo(models.Contract, { foreignKey: 'contractId', as: 'contract' });
      // Uma solicitação está vinculada a um local de trabalho
      this.belongsTo(models.WorkLocation, { foreignKey: 'workLocationId', as: 'workLocation' });
      // Uma solicitação de admissão é para um cargo
      this.belongsTo(models.Position, { foreignKey: 'positionId', as: 'position' });
      // Uma solicitação de desligamento/substituição refere-se a um funcionário existente
      this.belongsTo(models.Employee, { foreignKey: 'employeeId', as: 'employee' });
      // Uma solicitação tem um histórico de mudanças de status
      this.hasMany(models.RequestStatusLog, { foreignKey: 'requestId', as: 'statusHistory' });
      // Uma solicitação está vinculada a um Workflow
      this.belongsTo(models.Workflow, { foreignKey: 'workflowId', as: 'workflow' });
    }
  }
  Request.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    protocol: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false, // Protocol should always be set
    },
    // O campo 'type' foi removido conforme a especificação.
    // O tipo de solicitação será determinado pelo 'workflowId'.
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'PENDENTE', // Este valor será sobrescrito pelo nome da primeira etapa do workflow
      // Seus valores agora virão do 'name' das Steps
    },
    // Dados do candidato para admissão
    candidateName: DataTypes.STRING,
    candidateCpf: DataTypes.STRING,
    candidatePhone: DataTypes.STRING,
    // Motivo/justificativa para a solicitação
    reason: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'Request',
  });
  return Request;
};