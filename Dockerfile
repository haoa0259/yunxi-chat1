FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p /app/upload
EXPOSE 3000
CMD ["node", "server.js"]
