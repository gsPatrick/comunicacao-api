const { Resend } = require('resend');
const settingsService = require('../Settings/settings.service');

/**
 * Envia um e-mail usando a API REST do Resend.
 * @param {object} mailOptions - Opções do e-mail { to, subject, html }.
 * @throws {Error} Se a API Key do Resend não estiver configurada.
 */
const sendEmail = async (mailOptions) => {
  const apiKeySetting = await settingsService.getSetting('resendApiKey');

  if (!apiKeySetting || !apiKeySetting.value) {
    console.error('ERRO: A API Key do Resend não está configurada no sistema.');
    throw new Error('Email service is not configured.');
  }

  const resend = new Resend(apiKeySetting.value);

  try {
    await resend.emails.send({
      from: 'SAGEPE <contato@servfaz.app>', // Remetente fixo conforme solicitado e verificado no Resend
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
    });
    console.log(`Email enviado com sucesso para ${mailOptions.to} via API Resend.`);
  } catch (error) {
    console.error(`Erro ao enviar email para ${mailOptions.to} via API Resend:`, error);
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
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Olá, ${user.name}!</h2>
      <p>Sua conta no sistema SAGEPE foi criada com sucesso.</p>
      <p>Acesse o sistema utilizando as seguintes credenciais:</p>
      <ul style="list-style-type: none; padding: 0;">
        <li style="margin-bottom: 10px;"><strong>Email:</strong> ${user.email}</li>
        <li><strong>Senha Temporária:</strong> ${temporaryPassword}</li>
      </ul>
      <p>Recomendamos fortemente que você altere sua senha no primeiro acesso através da tela de configurações de perfil.</p>
      <br>
      <p>Atenciosamente,</p>
      <p><strong>Equipe Servfaz</strong></p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, html });
};

module.exports = {
  sendWelcomeEmail,
};