# ── Stage 1: Build ──
FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma (required in Debian-based images)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production ──
FROM node:20-slim AS production
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Security: run as non-root (Debian uses useradd instead of adduser)
RUN useradd --create-home --uid 1001 vaultgames

# Install only production deps
COPY package*.json ./
RUN npm install --legacy-peer-deps --only=production && npm cache clean --force

# Copy built files and prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

USER vaultgames

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]
