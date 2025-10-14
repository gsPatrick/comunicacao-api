'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Request extends Model {
    static associate(models) {
      // Associação com o Workflow
      Request.belongsTo(models.Workflow, {
        foreignKey: 'workflowId',
        as: 'workflow',
      });

      // Associação com a Empresa (Cliente)
      Request.belongsTo(models.Company, {
        foreignKey: 'companyId',
        as: 'company',
      });

      // Associação com o Contrato
      Request.belongsTo(models.Contract, {
        foreignKey: 'contractId',
        as: 'contract',
      });

      // Associação com o Local de Trabalho
      Request.belongsTo(models.WorkLocation, {
        foreignKey: 'workLocationId',
        as: 'workLocation',
      });

      // Associação com o Cargo/Categoria
      Request.belongsTo(models.Position, {
        foreignKey: 'positionId',
        as: 'position',
      });

      // Associação com o Colaborador (para desligamento, substituição, etc.)
      Request.belongsTo(models.Employee, {
        foreignKey: 'employeeId',
        as: 'employee',
      });

      // Associação com o Usuário solicitante
      Request.belongsTo(models.User, {
        foreignKey: 'solicitantId',
        as: 'solicitant',
      });

      // Associação com o Histórico de Status (uma solicitação tem muitos logs)
      Request.hasMany(models.RequestStatusLog, {
        foreignKey: 'requestId',
        as: 'statusHistory',
      });
    }
  }

  Request.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    protocol: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Chaves estrangeiras
    workflowId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'workflows',
        key: 'id',
      },
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    contractId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'contracts',
        key: 'id',
      },
    },
    workLocationId: {
      type: DataTypes.UUID,
      allowNull: true, // Pode ser nulo dependendo do tipo de solicitação
      references: {
        model: 'work_locations',
        key: 'id',
      },
    },
    positionId: {
      type: DataTypes.UUID,
      allowNull: true, // Pode ser nulo dependendo do tipo de solicitação
      references: {
        model: 'positions',
        key: 'id',
      },
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: true, // Usado para desligamento/substituição/troca
      references: {
        model: 'employees',
        key: 'id',
      },
    },
    solicitantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    // Dados específicos do candidato (para Admissão/Substituição)
    candidateName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    candidateCpf: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    candidatePhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Campo genérico para justificativas
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Request',
    tableName: 'requests', // Especifica o nome da tabela
    timestamps: true,
    underscored: true,
  });

  return Request;
};