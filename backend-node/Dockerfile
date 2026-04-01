FROM node:20-alpine

WORKDIR /app

# Instala ferramentas necessárias para compilar pacotes se o npm precisar
RUN apk add --no-cache python3 make g++

# Copia os arquivos de pacotes
COPY package*.json ./

# Instala as dependências de forma limpa
RUN npm install

# Copia o código da API
COPY . .

# Porta padrão
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]