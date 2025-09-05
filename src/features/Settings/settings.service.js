const { Setting } = require('../../models');

/**
 * Busca uma configuração pelo sua chave.
 * @param {string} key - A chave da configuração (ex: 'resendApiKey').
 * @returns {Promise<Setting|null>} A configuração encontrada ou nulo.
 */
const getSetting = async (key) => {
  const setting = await Setting.findByPk(key);
  return setting;
};

/**
 * Salva ou atualiza uma configuração.
 * @param {string} key - A chave da configuração.
 * @param {string} value - O valor da configuração.
 * @returns {Promise<Setting>} A configuração salva.
 */
const saveSetting = async (key, value) => {
  // O método upsert atualiza se a chave existir, ou insere se não existir.
  const [setting] = await Setting.upsert({ key, value });
  return setting;
};

module.exports = {
  getSetting,
  saveSetting,
};