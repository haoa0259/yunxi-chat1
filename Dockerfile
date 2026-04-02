FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY server.js .

RUN npm install
RUN npx prisma generate

EXPOSE 5000

CMD ["node", "server.js"]
