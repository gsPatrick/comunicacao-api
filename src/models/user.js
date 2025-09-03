'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Um usuário (solicitante) pode criar várias solicitações
      this.hasMany(models.Request, { foreignKey: 'solicitantId', as: 'createdRequests' });
      // Um usuário (RH/Gestão) pode ser o responsável por atualizar o status de várias solicitações
      this.hasMany(models.RequestStatusLog, { foreignKey: 'responsibleId', as: 'statusUpdates' });
      // Um usuário (Gestão/Solicitante) pode estar vinculado a várias empresas
      this.belongsToMany(models.Company, { through: 'UserCompany', foreignKey: 'userId', as: 'companies' });
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
      beforeUpdate: async(user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 8);
        }
      }
    }
  });
  return User;
};