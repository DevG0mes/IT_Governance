# Estágio 1: Build do Frontend com Node e Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependências e instala
COPY package*.json ./
RUN npm install

# Copia o restante do código e gera a versão de produção (pasta dist)
COPY . .
RUN npm run build

# Estágio 2: Servidor Web Nginx ultraleve
FROM nginx:alpine

# Cria uma configuração customizada para o Nginx suportar as rotas do React (React Router)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copia a pasta "dist" gerada pelo Vite para o diretório público do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expõe a porta HTTP padrão
EXPOSE 80

# Inicia o servidor
CMD ["nginx", "-g", "daemon off;"]