# ============================================================
#  BACKEND — image produksi
#  Kredensial TIDAK dimasukkan ke image.
#  Semuanya di-inject saat runtime lewat docker-compose (.env).
# ============================================================
FROM node:18-alpine

WORKDIR /usr/src/app

# Dependency dulu (layer cache)
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Baru salin source (file .env* sudah dikecualikan oleh .dockerignore)
COPY . .

# Folder data yang di-mount oleh compose
RUN mkdir -p /data/uploads /data/logs

ENV NODE_ENV=production
ENV PORT=5003

EXPOSE 5003

CMD ["node", "server.js"]
