'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  // NOME DO MODELO CORRIGIDO AQUI
  class CompanyPosition extends Model {
    static associate(models) {
      // Associações podem ser definidas aqui se necessário
    }
  }
  CompanyPosition.init({
    companyId: {
      type: DataTypes.UUID,
      references: { model: 'companies', key: 'id' },
      primaryKey: true,
    },
    positionId: {
      type: DataTypes.UUID,
      references: { model: 'positions', key: 'id' },
      primaryKey: true,
    },
  }, {
    sequelize,
    // NOME DO MODELO CORRIGIDO AQUI
    modelName: 'CompanyPosition',
    tableName: 'company_positions', // Garante o nome correto da tabela
  });
  return CompanyPosition;
};