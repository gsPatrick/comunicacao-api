/**
 * Módulo de simulação para envio de notificações.
 * Em um ambiente de produção, isso seria substituído por um serviço real
 * como Nodemailer, SendGrid, ou um sistema de mensageria (RabbitMQ, SQS).
 */

const sendNotification = async ({ recipient, subject, message, data }) => {
  console.log('--- SIMULATING NOTIFICATION ---');
  console.log(`To: ${recipient}`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  console.log('Data:', data);
  console.log('-------------------------------');
  // Em uma implementação real, o código de envio de e-mail/push estaria aqui.
  return Promise.resolve();
};

module.exports = {
  sendNotification,
};