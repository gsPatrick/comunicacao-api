const notificationService = require('./notification.service');

const getMyNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const notificationsData = await notificationService.getNotifications(userId, req.query);
    return res.status(200).json(notificationsData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const markOneAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { id: notificationId } = req.params;
    const success = await notificationService.markAsRead(notificationId, userId);
    if (!success) {
      return res.status(404).json({ error: 'Notification not found or already read.' });
    }
    return res.status(200).json({ message: 'Notification marked as read.' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const count = await notificationService.markAllAsRead(userId);
    return res.status(200).json({ message: `${count} notifications marked as read.` });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

module.exports = {
  getMyNotifications,
  markOneAsRead,
  markAllAsRead,
};