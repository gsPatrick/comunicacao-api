'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Position extends Model {
    static associate(models) {
      // Um cargo pode estar associado a vários funcionários
      this.hasMany(models.Employee, { foreignKey: 'positionId', as: 'employees' });
      // Um cargo pode ser vinculado a empresas específicas
      this.belongsToMany(models.Company, { through: 'CompanyPosition', foreignKey: 'positionId', as: 'companies' });
    }
  }
  Position.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
    },
  }, {
    sequelize,
    modelName: 'Position',
  });
  return Position;
};