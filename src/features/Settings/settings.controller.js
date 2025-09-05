const settingsService = require('./settings.service');

const getResendSettings = async (req, res) => {
  try {
    const apiKeySetting = await settingsService.getSetting('resendApiKey');
    // Retorna a chave ou um objeto vazio se não estiver configurada
    res.status(200).json({ apiKey: apiKeySetting ? apiKeySetting.value : '' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const saveResendSettings = async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: 'apiKey field is required.' });
  }

  try {
    await settingsService.saveSetting('resendApiKey', apiKey);
    res.status(200).json({ message: 'Resend API Key saved successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

module.exports = {
  getResendSettings,
  saveResendSettings,
};