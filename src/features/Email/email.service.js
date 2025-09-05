const nodemailer = require('nodemailer');
const settingsService = require('../Settings/settings.service');

/**
 * Envia um e-mail usando as configurações do Resend via SMTP.
 * @param {object} mailOptions - Opções do e-mail { to, subject, html }.
 * @throws {Error} Se a API Key do Resend não estiver configurada.
 */
const sendEmail = async (mailOptions) => {
  const apiKeySetting = await settingsService.getSetting('resendApiKey');

  if (!apiKeySetting || !apiKeySetting.value) {
    console.error('ERRO: A API Key do Resend não está configurada no sistema.');
    throw new Error('Email service is not configured.');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    secure: true,
    port: 465,
    auth: {
      user: 'resend',
      pass: apiKeySetting.value,
    },
  });

  const options = {
    from: 'SAGEPE <contato@servfaz.app>', // Remetente fixo conforme solicitado
    ...mailOptions,
  };

  try {
    await transporter.sendMail(options);
    console.log(`Email enviado com sucesso para ${options.to}`);
  } catch (error) {
    console.error(`Erro ao enviar email para ${options.to}:`, error);
    // Não relança o erro para não quebrar o fluxo principal (ex: criação de usuário)
  }
};

/**
 * Envia um e-mail de boas-vindas para um novo usuário.
 * @param {object} user - O objeto do usuário criado.
 * @param {string} temporaryPassword - A senha inicial definida pelo admin.
 */
const sendWelcomeEmail = async (user, temporaryPassword) => {
  const subject = 'Bem-vindo ao SAGEPE!';
  const html = `
    <h1>Olá, ${user.name}!</h1>
    <p>Sua conta no sistema SAGEPE foi criada com sucesso.</p>
    <p>Acesse o sistema utilizando as seguintes credenciais:</p>
    <ul>
      <li><strong>Email:</strong> ${user.email}</li>
      <li><strong>Senha Temporária:</strong> ${temporaryPassword}</li>
    </ul>
    <p>Recomendamos fortemente que você altere sua senha no primeiro acesso através da tela de configurações de perfil.</p>
    <br>
    <p>Atenciosamente,</p>
    <p>Equipe Servfaz</p>
  `;

  await sendEmail({ to: user.email, subject, html });
};

module.exports = {
  sendWelcomeEmail,
};