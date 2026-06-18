FROM node:24-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8787
ENV ECHO_DATA_DIR=/data

VOLUME ["/data"]
EXPOSE 8787

CMD ["npm", "run", "server"]
