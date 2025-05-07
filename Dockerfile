FROM node:18-alpine

WORKDIR /app

# Instalar dependencias primero para aprovechar la caché de Docker
COPY package*.json ./
RUN npm ci

# Copiar el código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Puerto expuesto (opcional, para APIs futuras)
EXPOSE 3000

# El comando se especificará en docker-compose.yml
CMD ["node", "dist/index.js"]