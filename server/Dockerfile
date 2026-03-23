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

# Create non-root user
RUN useradd --create-home --uid 1001 vaultgames

# Install only production deps
COPY package*.json ./
RUN npm install --legacy-peer-deps --only=production && npm cache clean --force

# Install Prisma CLI (needed for migrations)
RUN npm install --legacy-peer-deps --save-dev prisma@^5.14.0

# Copy built files and prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Run migrations (as root, for permissions)
RUN npx prisma migrate deploy || true

# Fix permissions for non-root user
RUN chown -R 1001:1001 /app

USER vaultgames

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]
