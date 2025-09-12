'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Associações Originais
      this.hasMany(models.Request, { foreignKey: 'solicitantId', as: 'createdRequests' });
      this.hasMany(models.RequestStatusLog, { foreignKey: 'responsibleId', as: 'statusUpdates' });
      this.belongsToMany(models.Company, { through: 'UserCompany', foreignKey: 'userId', as: 'companies' });

      // --- NOVAS ASSOCIAÇÕES PARA PERMISSÕES GRANULARES ---
      // Um usuário tem muitas entradas na tabela de permissões (relação direta com a tabela pivot)
      this.hasMany(models.UserPermission, { foreignKey: 'userId', as: 'userPermissions' });

      // Um usuário tem muitas permissões, através da tabela UserPermission
      this.belongsToMany(models.Permission, {
        through: models.UserPermission,
        foreignKey: 'userId',
        otherKey: 'permissionKey',
        as: 'permissions'
      });
      // ---------------------------------------------------
    }
  }
  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
    },
    profile: {
      type: DataTypes.ENUM('ADMIN', 'RH', 'GESTAO', 'SOLICITANTE'),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'User',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 8);
        }
      },
      beforeUpdate: async (user) => {
        // O hook agora só executa o hash se o campo 'password' foi de fato alterado.
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 8);
        }
      }
    }
  });
  return User;
};