
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Contract extends Model {
    static associate(models) {
      // Um contrato pertence a uma empresa
      this.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      // Um contrato pode ter vários locais de trabalho
      this.hasMany(models.WorkLocation, { foreignKey: 'contractId', as: 'workLocations' });
    }
  }
  Contract.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contractNumber: {
      type: DataTypes.STRING,
      unique: true,
    },
    startDate: {
      type: DataTypes.DATE,
    },
    endDate: {
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'Contract',
  });
  return Contract;
};