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
      // Pode ser gerado automaticamente via hooks ou no service
    },
    type: {
      type: DataTypes.ENUM('ADMISSAO', 'DESLIGAMENTO', 'SUBSTITUICAO'),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'PENDENTE',
      // Ex: PENDENTE, EM_ANALISE, APROVADA, REPROVADA, EM_ENTREVISTA, ...
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