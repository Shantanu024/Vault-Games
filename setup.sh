#!/usr/bin/env bash
# VaultGames — one-command local dev setup
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

info()    { echo -e "${GREEN}[setup]${RESET} $1"; }
warn()    { echo -e "${YELLOW}[warn]${RESET}  $1"; }
error()   { echo -e "${RED}[error]${RESET} $1"; exit 1; }
section() { echo -e "\n${BOLD}── $1 ──${RESET}"; }

section "VaultGames Dev Setup"

# ── Check prerequisites ──────────────────────────────────────
section "Checking prerequisites"

command -v node  >/dev/null 2>&1 || error "Node.js not found. Install from https://nodejs.org (v20+)"
command -v npm   >/dev/null 2>&1 || error "npm not found"
command -v docker >/dev/null 2>&1 || warn "Docker not found — you'll need to run databases manually"

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js v18+ required (found v$NODE_VERSION)"
fi
info "Node.js $(node -v) ✓"

# ── Environment files ────────────────────────────────────────
section "Setting up environment files"

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  info "Created server/.env from .env.example"
  warn "Please edit server/.env with your credentials before starting"
else
  info "server/.env already exists"
fi

if [ ! -f client/.env ]; then
  cp client/.env.example client/.env
  info "Created client/.env"
else
  info "client/.env already exists"
fi

# ── Install dependencies ─────────────────────────────────────
section "Installing dependencies"

info "Installing server dependencies..."
cd server && npm install && cd ..

info "Installing client dependencies..."
cd client && npm install && cd ..

# ── Start databases ──────────────────────────────────────────
section "Starting databases (Docker)"

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    info "Starting PostgreSQL, MongoDB, Redis via Docker..."
    docker compose up postgres mongo redis -d
    info "Waiting for databases to be ready..."
    sleep 5

    info "Running database migrations..."
    cd server
    npx prisma generate
    npx prisma migrate deploy
    cd ..
    info "Migrations complete ✓"
  else
    warn "Docker daemon not running — skipping database startup"
    warn "Start databases manually and re-run migrations:"
    warn "  cd server && npx prisma migrate dev"
  fi
else
  warn "Docker not installed — start PostgreSQL, MongoDB, Redis manually"
  warn "Then run: cd server && npx prisma generate && npx prisma migrate dev"
fi

# ── Done ─────────────────────────────────────────────────────
section "Setup complete"

echo ""
echo -e "${BOLD}Start the development servers:${RESET}"
echo ""
echo "  # In one terminal:"
echo "  cd server && npm run dev"
echo ""
echo "  # In another terminal:"
echo "  cd client && npm run dev"
echo ""
echo -e "${BOLD}Or from root (both at once):${RESET}"
echo "  npm install && npm run dev"
echo ""
echo -e "  App:    ${GREEN}http://localhost:5173${RESET}"
echo -e "  API:    ${GREEN}http://localhost:5000${RESET}"
echo -e "  Health: ${GREEN}http://localhost:5000/health${RESET}"
echo ""
echo -e "${YELLOW}Remember to fill in server/.env with your:${RESET}"
echo "  • Gmail App Password (for OTP emails)"
echo "  • Cloudinary credentials (for avatar uploads)"
echo "  • Anthropic API key (for AI helpdesk chatbot)"
echo ""
