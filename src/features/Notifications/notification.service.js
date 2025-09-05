
const { Notification, User } = require('../../models');
const { Op } = require('sequelize');

/**
 * Cria uma nova notificação no banco de dados.
 * @param {object} notificationData - Dados da notificação ({ recipientId, title, message, link, data }).
 * @returns {Promise<Notification>} A notificação criada.
 */
const createNotification = async ({ recipientId, title, message, link = null, data = {} }) => {
  if (!recipientId || !title || !message) {
    throw new Error('Recipient ID, title, and message are required for notification.');
  }

  // Verificar se o usuário existe para o qual a notificação está sendo enviada
  const userExists = await User.findByPk(recipientId, { attributes: ['id'] });
  if (!userExists) {
    console.warn(`Attempted to send notification to non-existent user ID: ${recipientId}`);
    return null; // Ou lançar um erro dependendo da política
  }

  const notification = await Notification.create({
    userId: recipientId,
    title,
    message,
    link,
    data,
  });
  return notification;
};

/**
 * Busca notificações para um usuário, com filtros e paginação.
 * @param {string} userId - O ID do usuário.
 * @param {object} filters - Filtros ({ isRead, page, limit }).
 * @returns {Promise<{total: number, notifications: Array<Notification>, page: number, limit: number}>}
 */
const getNotifications = async (userId, filters) => {
  const { isRead, page = 1, limit = 10 } = filters;
  const where = { userId };

  if (isRead !== undefined) {
    where.isRead = isRead;
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await Notification.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });

  return { total: count, notifications: rows, page, limit };
};

/**
 * Marca uma notificação específica como lida.
 * @param {string} notificationId - O ID da notificação.
 * @param {string} userId - O ID do usuário proprietário da notificação.
 * @returns {Promise<boolean>} True se a notificação foi marcada como lida, false caso contrário.
 */
const markAsRead = async (notificationId, userId) => {
  const [updatedRows] = await Notification.update(
    { isRead: true },
    { where: { id: notificationId, userId, isRead: false } }
  );
  return updatedRows > 0;
};

/**
 * Marca todas as notificações não lidas de um usuário como lidas.
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<number>} O número de notificações marcadas como lidas.
 */
const markAllAsRead = async (userId) => {
  const [updatedRows] = await Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } }
  );
  return updatedRows;
};

module.exports = {
  sendNotification: createNotification, // Renomeado para seguir a convenção de serviço
  getNotifications,
  markAsRead,
  markAllAsRead,
};