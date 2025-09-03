    'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserCompany extends Model {
    static associate(models) {
      // Associações podem ser definidas aqui se necessário
    }
  }
  UserCompany.init({
    userId: {
      type: DataTypes.UUID,
      references: { model: 'Users', key: 'id' },
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      references: { model: 'Companies', key: 'id' },
      primaryKey: true,
    },
  }, {
    sequelize,
    modelName: 'UserCompany',
  });
  return UserCompany;
};