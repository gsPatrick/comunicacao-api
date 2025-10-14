'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  // NOME DO MODELO CORRIGIDO AQUI
  class UserCompany extends Model {
    static associate(models) {
      // Associações podem ser definidas aqui se necessário
    }
  }
  UserCompany.init({
    userId: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      references: { model: 'companies', key: 'id' },
      primaryKey: true,
    },
  }, {
    sequelize,
    // NOME DO MODELO CORRIGIDO AQUI
    modelName: 'UserCompany',
    tableName: 'user_companies', // Garante o nome correto da tabela
  });
  return UserCompany;
};