'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Company extends Model {
    static associate(models) {
      // Uma empresa pode ter vários contratos
      this.hasMany(models.Contract, { foreignKey: 'companyId', as: 'contracts' });
      // Uma empresa pode ter várias solicitações
      this.hasMany(models.Request, { foreignKey: 'companyId', as: 'requests' });
      // Uma empresa pode ter vários usuários vinculados (Gestão/Solicitante)
      this.belongsToMany(models.User, { through: 'UserCompany', foreignKey: 'companyId', as: 'users' });
       // Uma empresa pode ter cargos específicos vinculados
      this.belongsToMany(models.Position, { through: 'CompanyPosition', foreignKey: 'companyId', as: 'specificPositions' });
    }
  }
  Company.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    corporateName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tradeName: {
      type: DataTypes.STRING,
    },
    cnpj: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    address: {
      type: DataTypes.STRING,
    },
  }, {
    sequelize,
    modelName: 'Company',
  });
  return Company;
};