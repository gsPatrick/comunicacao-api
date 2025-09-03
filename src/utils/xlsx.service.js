const xlsx = require('xlsx');

/**
 * Converte um array de objetos JSON para um buffer de arquivo XLSX.
 * @param {Array<object>} data - O array de dados a ser convertido.
 * @returns {Buffer} Um buffer contendo o arquivo XLSX.
 */
const jsonToXlsxBuffer = (data) => {
  // Cria uma nova planilha a partir dos dados JSON
  const worksheet = xlsx.utils.json_to_sheet(data);
  
  // Cria um novo workbook (o próprio arquivo Excel)
  const workbook = xlsx.utils.book_new();
  
  // Adiciona a planilha ao workbook com o nome "Dados"
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Dados');

  // Escreve o workbook para um buffer em memória
  // 'buffer' é o tipo de output, essencial para enviar em respostas HTTP
  const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  return buffer;
};

module.exports = {
  jsonToXlsxBuffer,
};