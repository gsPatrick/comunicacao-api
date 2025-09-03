// Carrega as variáveis de ambiente do arquivo .env no início do processo
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const mainRouter = require('./routes');

// Inicializa a aplicação Express
const app = express();

// --- Middlewares Globais ---

// Habilita o CORS para permitir requisições de diferentes origens (essencial para o frontend)
app.use(cors());

// Habilita o parsing de requisições com corpo no formato JSON
app.use(express.json());

// Habilita o parsing de requisições com corpo no formato x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));


// --- Rotas da Aplicação ---

// Rota de Health Check para verificar se a API está online
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'API is running successfully', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Monta o roteador principal sob o prefixo /api
// Todas as rotas da nossa aplicação serão acessadas via /api/...
app.use('/api', mainRouter);


// --- Tratamento de Erros ---

// Middleware para tratar rotas não encontradas (404)
// Ele será acionado se nenhuma das rotas acima corresponder à requisição
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found', message: `The requested URL ${req.originalUrl} was not found on this server.` });
});

// Middleware global para tratamento de erros (Error Handler)
// Captura qualquer erro não tratado que ocorra nos controllers ou serviços
app.use((err, req, res, next) => {
    console.error('--- UNHANDLED ERROR ---');
    console.error(err.stack);
    console.error('-----------------------');
    
    // Evita vazar detalhes sensíveis em produção
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({ 
        error: 'Internal Server Error', 
        details: isProduction ? 'An unexpected error occurred.' : err.message 
    });
});


// --- Inicialização do Servidor ---

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access health check at http://localhost:${PORT}`);
  
  try {
    // Tenta autenticar a conexão com o banco de dados na inicialização
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Opcional: Sincronizar modelos (usar com cuidado em produção)
     await sequelize.sync({ force: true }); // Use { force: true } para recriar as tabelas
    // console.log("All models were synchronized successfully.");

  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});