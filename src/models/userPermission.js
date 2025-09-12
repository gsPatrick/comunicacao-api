'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserPermission extends Model {
    static associate(models) {
      // Associações diretas se necessário
      this.belongsTo(models.User, { foreignKey: 'userId' });
      this.belongsTo(models.Permission, { foreignKey: 'permissionKey' });
    }
  }
  UserPermission.init({
    userId: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    permissionKey: {
      type: DataTypes.STRING,
      primaryKey: true,
      references: { model: 'permissions', key: 'key' },
      onDelete: 'CASCADE',
    },
    // scopeType e scopeId definem o ESCOPO da permissão
    scopeType: {
      type: DataTypes.ENUM('COMPANY', 'CONTRACT'),
      allowNull: true, // Nulo significa que a permissão é global (não restrita a um recurso)
    },
    scopeId: {
      type: DataTypes.UUID,
      allowNull: true, // Nulo quando a permissão for global
    },
  }, {
    sequelize,
    modelName: 'UserPermission',
    tableName: 'user_permissions',
    timestamps: false,
    // Validação para garantir que scopeId exista se scopeType for definido
    validate: {
      scopeIdRequired() {
        if (this.scopeType && !this.scopeId) {
          throw new Error('scopeId is required when scopeType is defined.');
        }
      }
    }
  });
  return UserPermission;
};