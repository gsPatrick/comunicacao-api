'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Employee extends Model {
    static associate(models) {
      // Um funcionário pertence a um cargo
      this.belongsTo(models.Position, { foreignKey: 'positionId', as: 'position' });
      // Um funcionário está alocado a um local de trabalho
      this.belongsTo(models.WorkLocation, { foreignKey: 'workLocationId', as: 'workLocation' });
       // Um funcionário está vinculado a um contrato
      this.belongsTo(models.Contract, { foreignKey: 'contractId', as: 'contract' });
    }
  }
  Employee.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cpf: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    registration: { // Matrícula
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    admissionDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
    },
  }, {
    sequelize,
    modelName: 'Employee',
  });
  return Employee;
};