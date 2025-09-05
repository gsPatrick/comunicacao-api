'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CompanyPosition extends Model {
    static associate(models) {
      // Associações podem ser definidas aqui se necessário
    }
  }
  CompanyPosition.init({
    companyId: {
      type: DataTypes.UUID,
      references: { model: 'companies', key: 'id' }, // CORRIGIDO: 'Companies' para 'companies'
      primaryKey: true,
    },
    positionId: {
      type: DataTypes.UUID,
      references: { model: 'positions', key: 'id' }, // CORRIGIDO: 'Positions' para 'positions'
      primaryKey: true,
    },
  }, {
    sequelize,
    modelName: 'CompanyPosition',
  });
  return CompanyPosition;
};