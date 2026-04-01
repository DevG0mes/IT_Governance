FROM node:20-alpine

WORKDIR /app

# Instala dependências do sistema necessárias para algumas bibliotecas de PDF/Canvas se precisar
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]