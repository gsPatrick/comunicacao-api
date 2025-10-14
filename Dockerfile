# --- Estágio 1: Build ---
FROM mirror.gcr.io/library/node:20-slim AS build

# Define diretório de trabalho
WORKDIR /app

# Instala dependências do sistema (necessárias para node-gyp, caso alguma dep precise)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        build-essential \
        g++ \
        make && \
    rm -rf /var/lib/apt/lists/*

# Copia apenas arquivos de dependências para aproveitar cache
COPY package*.json ./

# Instala dependências sem as devDependencies
RUN npm install --omit=dev

# Copia o restante da aplicação
COPY . .

# --- Estágio 2: Runtime ---
FROM mirror.gcr.io/library/node:20-slim AS runtime

WORKDIR /app

# Copia a aplicação e node_modules do estágio de build
COPY --from=build /app ./

# Expõe a porta padrão
EXPOSE 3000

# Define variáveis de ambiente básicas
ENV NODE_ENV=production

# Comando padrão de inicialização
CMD ["node", "src/app.js"]
