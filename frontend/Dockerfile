FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat wget

# Copy package files
COPY package.json package-lock.json ./

# Clean npm cache dan install dependencies
RUN npm cache clean --force && \
    npm ci --no-audit --legacy-peer-deps

# Copy source code
COPY . .

# Env variabel untuk build — Next.js me-bake NEXT_PUBLIC_* saat build,
# jadi harus diisi dari build args (bukan runtime). Nilai dari compose build.args.
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build aplikasi Next.js
RUN npm run build

# Port aplikasi (sama dengan `next start -p 3004` di package.json)
ENV PORT=3004
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

EXPOSE 3004

# Start aplikasi
CMD ["npm", "start"]