// Carrega as variáveis de ambiente do arquivo .env no início do processo
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { sequelize, User } = require('./models'); // Importando o modelo User
const mainRouter = require('./routes');

// Inicializa a aplicação Express
const app = express();

// --- Middlewares Globais ---

// Configuração de CORS
// Configuração global de CORS (liberando todas as rotas e origens)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Responde manualmente preflight requests (OPTIONS) para todas as rotas
app.options("(.*)", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});



// Parsing de JSON e URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// --- Função para Criar Usuário Admin Padrão ---

const createDefaultAdmin = async () => {
  try {
    const adminEmail = 'admin@admin.com';
    const adminExists = await User.findOne({ where: { email: adminEmail } });

    if (!adminExists) {
      await User.create({
        name: 'Administrador Padrão',
        email: adminEmail,
        password: 'Admin123', // O hook no model irá criptografar a senha
        profile: 'ADMIN',
        isActive: true,
      });
      console.log('Default admin user created successfully.');
    } else {
      console.log('Default admin user already exists.');
    }
  } catch (error) {
    console.error('Error creating default admin user:', error);
  }
};


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
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found', message: `The requested URL ${req.originalUrl} was not found on this server.` });
});

// Middleware global para tratamento de erros (Error Handler)
app.use((err, req, res, next) => {
    console.error('--- UNHANDLED ERROR ---');
    console.error(err.stack);
    console.error('-----------------------');
    
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({ 
        error: 'Internal Server Error', 
        details: isProduction ? 'An unexpected error occurred.' : err.message 
    });
});


// --- Inicialização do Servidor ---

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access health check at http://localhost:${PORT}`);
  
  try {
    // Tenta autenticar a conexão com o banco de dados
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sincroniza os modelos com o banco de dados, forçando a recriação das tabelas
    await sequelize.sync({ force: true });
    console.log("All models were synchronized successfully (force: true).");

    // Após sincronizar, chama a função para criar o admin padrão
    await createDefaultAdmin();

  } catch (error) {
    console.error('Unable to connect to the database or sync models:', error);
  }
});
