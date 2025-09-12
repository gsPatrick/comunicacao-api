'use strict';

const { Permission } = require('../models');

// A mesma lista de permissões do seu arquivo de seeder
const permissionsList = [
  { key: 'dashboard:view', description: 'Acessar a tela do Dashboard' },
  { key: 'requests:create', description: 'Criar novas solicitações' },
  { key: 'requests:read:own', description: 'Ver apenas as próprias solicitações' },
  { key: 'requests:read:company', description: 'Ver solicitações da(s) empresa(s) associada(s)' },
  { key: 'requests:read:all', description: 'Ver todas as solicitações do sistema' },
  { key: 'requests:update', description: 'Mudar o status de uma solicitação' },
  { key: 'requests:export', description: 'Exportar dados de solicitações' },
  { key: 'users:read', description: 'Visualizar usuários' },
  { key: 'users:write', description: 'Criar/Editar/Desativar usuários' },
  { key: 'companies:read', description: 'Visualizar clientes' },
  { key: 'companies:write', description: 'Criar/Editar/Excluir clientes' },
  { key: 'contracts:read', description: 'Visualizar contratos' },
  { key: 'contracts:write', description: 'Criar/Editar/Excluir contratos' },
  { key: 'work-locations:read', description: 'Visualizar locais de trabalho' },
  { key: 'work-locations:write', description: 'Criar/Editar/Excluir locais de trabalho' },
  { key: 'positions:read', description: 'Visualizar categorias/cargos' },
  { key: 'positions:write', description: 'Criar/Editar/Excluir categorias/cargos' },
  { key: 'employees:read', description: 'Visualizar colaboradores' },
  { key: 'employees:write', description: 'Criar/Editar/Excluir colaboradores' },
  { key: 'employees:import', description: 'Importar colaboradores em lote' },
  { key: 'reports:view', description: 'Acessar a tela de relatórios' },
  { key: 'workflows:read', description: 'Visualizar configurações de workflows' },
  { key: 'workflows:write', description: 'Editar configurações de workflows' },
  { key: 'steps:read', description: 'Visualizar etapas dos workflows' },
  { key: 'steps:write', description: 'Criar/Editar/Excluir etapas dos workflows' },
  { key: 'email-settings:read', description: 'Visualizar configurações de e-mail' },
  { key: 'email-settings:write', description: 'Editar configurações de e-mail' },
  { key: 'associations:manage', description: 'Vincular/desvincular usuários a empresas' },
];

/**
 * Popula a tabela de permissões se ela estiver vazia.
 * @param {object} options - Opções, incluindo a transação.
 * @param {import('sequelize').Transaction} options.transaction - A transação do Sequelize.
 */
const seedPermissions = async ({ transaction }) => {
  try {
    const count = await Permission.count({ transaction });
    if (count === 0) {
      console.log('- Tabela de permissões vazia. Populando com dados iniciais...');
      await Permission.bulkCreate(permissionsList, { transaction });
      console.log(`- ${permissionsList.length} permissões criadas com sucesso.`);
    } else {
      console.log('- Tabela de permissões já populada. Nenhuma ação necessária.');
    }
  } catch (error) {
    console.error('Erro ao popular a tabela de permissões:', error);
    throw error; // Lança o erro para que a transação principal possa fazer rollback
  }
};

module.exports = { seedPermissions };