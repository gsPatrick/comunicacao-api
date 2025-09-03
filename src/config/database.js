require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: false, // Em produção, pode ser necessário configurar SSL
    },
    define: {
      timestamps: true, // Cria colunas createdAt e updatedAt
      underscored: true, // Usa snake_case para nomes de colunas no DB
      underscoredAll: true,
    },
  },
  test: {
    // Configurações para ambiente de teste
  },
  production: {
    // Configurações para ambiente de produção
  }
};