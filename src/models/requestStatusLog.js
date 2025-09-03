'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RequestStatusLog extends Model {
    static associate(models) {
      // O log pertence a uma solicitação
      this.belongsTo(models.Request, { foreignKey: 'requestId', as: 'request' });
      // O log foi gerado por um usuário
      this.belongsTo(models.User, { foreignKey: 'responsibleId', as: 'responsible' });
    }
  }
  RequestStatusLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    status: { // O status que foi definido
      type: DataTypes.STRING,
      allowNull: false,
    },
    notes: { // Ex: Motivo da reprovação, observações
      type: DataTypes.TEXT,
    }
  }, {
    sequelize,
    modelName: 'RequestStatusLog',
  });
  return RequestStatusLog;
};