'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate(models) {
      this.belongsToMany(models.User, { through: models.UserPermission, foreignKey: 'permissionKey', as: 'users' });
    }
  }
  Permission.init({
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Permission',
    timestamps: false, // Esta tabela é mais estática
  });
  return Permission;
};