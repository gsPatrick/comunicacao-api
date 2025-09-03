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
      references: { model: 'Companies', key: 'id' },
      primaryKey: true,
    },
    positionId: {
      type: DataTypes.UUID,
      references: { model: 'Positions', key: 'id' },
      primaryKey: true,
    },
  }, {
    sequelize,
    modelName: 'CompanyPosition',
  });
  return CompanyPosition;
};