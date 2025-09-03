'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WorkLocation extends Model {
    static associate(models) {
      // Um local de trabalho pertence a um contrato
      this.belongsTo(models.Contract, { foreignKey: 'contractId', as: 'contract' });
    }
  }
  WorkLocation.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
    },
  }, {
    sequelize,
    modelName: 'WorkLocation',
  });
  return WorkLocation;
};