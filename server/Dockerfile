# ── Stage 1: Build ──
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production ──
FROM node:20-alpine AS production
WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S nodejs && adduser -S vaultgames -u 1001

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
