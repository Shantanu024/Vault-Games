# 🎮 VaultGames

A production-grade multiplayer gaming web application built with React, Node.js, Socket.io, PostgreSQL, MongoDB, and Redis.

---

## 🗂 Project Structure

```
vaultgames/
├── client/                    # React 18 + Vite + TailwindCSS frontend
│   ├── src/
│   │   ├── pages/             # AuthPage, HomePage, ProfilePage, FriendsPage, game pages
│   │   ├── components/
│   │   │   ├── layout/        # Layout, TopBar, Sidebar
│   │   │   ├── ui/            # Avatar, ProfileCompletionModal
│   │   │   └── chat/          # AIChatBot (floating helpdesk)
│   │   ├── store/             # Zustand stores: auth, socket, ui, friends
│   │   ├── hooks/             # useAuthInit, useGlobalSocketEvents
│   │   ├── config/            # api.ts (Axios + interceptors)
│   │   └── styles/            # globals.css (Tailwind + custom)
│   ├── Dockerfile             # Production build (Nginx)
│   ├── Dockerfile.dev         # Development build
│   └── nginx.conf             # Reverse proxy config
│
├── server/
│   ├── src/
│   │   ├── config/            # prisma.ts, mongodb.ts, redis.ts, cloudinary.ts
│   │   ├── controllers/       # authController, userController, friendController
│   │   ├── middleware/        # auth.ts (JWT), errorHandler.ts, notFound.ts
│   │   ├── models/            # (MongoDB models go here if needed)
│   │   ├── routes/            # auth, users, friends, games, chat, upload
│   │   ├── services/          # emailService, minesEngine, wordJumbleEngine
│   │   ├── sockets/           # index.ts, minesSocket.ts, wordJumbleSocket.ts
│   │   ├── utils/             # jwt.ts, generators.ts
│   │   └── index.ts           # Express + Socket.io server entry
│   ├── prisma/
│   │   └── schema.prisma      # PostgreSQL schema (users, friendships, games)
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml         # All services: postgres, mongo, redis, server, client
├── .github/workflows/         # GitHub Actions CI/CD
└── README.md
```

---

## ⚙️ Tech Stack

| Layer        | Technology                                          |
|--------------|-----------------------------------------------------|
| Frontend     | React 18, Vite, TailwindCSS, Framer Motion          |
| State        | Zustand (auth, socket, UI, friends)                 |
| Data Fetching| TanStack Query v5                                   |
| Real-time    | Socket.io (client + server)                         |
| Backend      | Node.js + Express + TypeScript                      |
| Auth         | JWT (access + refresh), bcryptjs, OTP via email     |
| Primary DB   | PostgreSQL via Prisma ORM                           |
| Document DB  | MongoDB via Mongoose                                |
| Cache / RT   | Redis (sessions, OTPs, room state, presence)        |
| File Storage | Cloudinary (avatar images)                          |
| Email        | Nodemailer (Gmail SMTP / Resend API)                |
| AI Helpdesk  | Anthropic Claude Haiku via SDK                      |
| Hosting      | Railway or Render (recommended)                     |
| CI/CD        | GitHub Actions                                      |
| Containers   | Docker + Docker Compose + Nginx                     |

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- Git

### 1. Clone and install

```bash
git clone https://github.com/your-username/vaultgames.git
cd vaultgames

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Random 32+ char secret |
| `JWT_REFRESH_SECRET` | Different random 32+ char secret |
| `EMAIL_HOST` | SMTP host (e.g. `smtp.gmail.com`) |
| `EMAIL_USER` | Your Gmail address |
| `EMAIL_PASS` | Gmail App Password (not regular password) |
| `CLOUDINARY_CLOUD_NAME` | From cloudinary.com dashboard |
| `CLOUDINARY_API_KEY` | From cloudinary.com dashboard |
| `CLOUDINARY_API_SECRET` | From cloudinary.com dashboard |
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `CLIENT_URL` | `http://localhost:5173` |

### 3. Start databases with Docker

```bash
# Start only the database services
docker-compose up postgres mongo redis -d

# Verify they are running
docker-compose ps
```

### 4. Run database migrations

```bash
cd server

# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

### 5. Start development servers

```bash
# From the root — starts both server (port 5000) and client (port 5173) concurrently
npm run dev
```

Or start them separately:

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

### 6. Open the app

Navigate to **http://localhost:5173**

---

## 🔑 Gmail App Password Setup

For OTP emails to work, you need a Gmail App Password (not your regular password):

1. Enable 2-Step Verification on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create a new app password for "Mail"
4. Paste it into `EMAIL_PASS` in your `.env`

---

## ☁️ Cloudinary Setup

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. From your dashboard, copy **Cloud Name**, **API Key**, **API Secret**
3. Paste into the three `CLOUDINARY_*` env vars

---

## 🐳 Full Docker Deployment

```bash
# Copy and fill in your env vars
cp server/.env.example .env

# Build and start all services
docker-compose up --build -d

# Run migrations inside the container
docker-compose exec server npx prisma migrate deploy

# View logs
docker-compose logs -f server
docker-compose logs -f client
```

---

## 🚂 Deploy to Railway (Recommended)

Railway provides managed PostgreSQL, Redis, and hosting in one place.

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Step 2: Create project
```bash
railway init
```

### Step 3: Add services
- In the Railway dashboard, add **PostgreSQL** plugin → copy `DATABASE_URL`
- Add **Redis** plugin → copy `REDIS_URL`
- For MongoDB, use [MongoDB Atlas](https://cloud.mongodb.com) free tier → copy `MONGODB_URI`

### Step 4: Set environment variables
In Railway dashboard → your service → Variables, add all variables from `.env.example`

### Step 5: Deploy
```bash
# Deploy server
railway up --service server

# Deploy client
railway up --service client
```

### Step 6: CI/CD Secrets for GitHub Actions

Add these secrets in GitHub → Settings → Secrets:

| Secret | Value |
|---|---|
| `RAILWAY_TOKEN` | From Railway dashboard → Account → Tokens |
| `VITE_SERVER_URL` | Your Railway server URL |
| `PRODUCTION_URL` | Your Railway client URL |
| `JWT_ACCESS_SECRET` | Same as in Railway env |
| `JWT_REFRESH_SECRET` | Same as in Railway env |

---

## 🎮 Game Rules

### Mines
- 2–6 players join a room (host sets mine count: 1–15, grid is 5×5 = 25 tiles)
- Players take turns clicking tiles
- **Safe tile** → +10 points, turn passes to next player
- **Mine tile** → player is eliminated, turn passes
- Last player standing wins and earns coins
- Turn timer (configurable: 15–60s) auto-advances on timeout

### Word Jumble
- 2–8 players, configurable rounds (3–10) and time per round (15–60s)
- Each round: server picks a word, scrambles it, sends to all players
- First correct answer wins the round
- Speed bonus: faster = more points (max 100, min 20)
- Most total points after all rounds wins and earns coins

---

## 🔐 Security Features

- **bcryptjs** (12 rounds) for password hashing
- **JWT** with short-lived access tokens (15m) + long-lived refresh tokens (7d, httpOnly cookie)
- **Refresh token rotation** — reuse detection invalidates all tokens for that user
- **OTP rate limiting** — max 3 OTP requests per email per hour, 10-minute expiry
- **Helmet.js** — sets 11 security-related HTTP headers
- **express-rate-limit** — 300 req/15min global, 20 req/15min for auth routes
- **CORS** — origin whitelisted to `CLIENT_URL` only
- **Input validation** — express-validator on all auth inputs
- **SQL injection** — prevented by Prisma's parameterized queries
- **XSS** — Helmet CSP + React's default escaping

---

## 📁 Key File Reference

| File | Purpose |
|---|---|
| `server/src/index.ts` | Express + Socket.io server bootstrap |
| `server/prisma/schema.prisma` | All database tables (users, friendships, game sessions) |
| `server/src/utils/jwt.ts` | Token creation, verification, rotation |
| `server/src/services/minesEngine.ts` | Pure game logic for Mines (no I/O) |
| `server/src/services/wordJumbleEngine.ts` | Pure game logic for Word Jumble |
| `server/src/sockets/minesSocket.ts` | Socket.io handlers for Mines rooms |
| `server/src/sockets/wordJumbleSocket.ts` | Socket.io handlers for Word Jumble rooms |
| `client/src/store/authStore.ts` | Zustand auth state + token persistence |
| `client/src/store/socketStore.ts` | Socket.io connection management |
| `client/src/config/api.ts` | Axios instance with auto token-refresh interceptor |
| `client/src/hooks/useAuthInit.ts` | Session restore on app load |
| `client/src/hooks/useGlobalSocketEvents.ts` | Global friend presence + notification listeners |
| `client/src/pages/MinesGamePage.tsx` | Complete Mines game UI (lobby → play → results) |
| `client/src/pages/WordJumblePage.tsx` | Complete Word Jumble UI |
| `client/src/components/chat/AIChatBot.tsx` | Floating AI helpdesk widget |

---

## 🛣 Adding New Games

1. Create `server/src/services/yourGameEngine.ts` — pure logic, no socket I/O
2. Create `server/src/sockets/yourGameSocket.ts` — register event handlers
3. Register it in `server/src/sockets/index.ts`
4. Add `YOUR_GAME` to the `GameType` enum in `prisma/schema.prisma`
5. Create `client/src/pages/YourGamePage.tsx`
6. Add the route in `client/src/App.tsx`
7. Add it to `server/src/routes/games.ts` `/active` endpoint

---

## 🧩 Environment Variables Summary

```
# server/.env

NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=<32+ random chars>
JWT_REFRESH_SECRET=<32+ different random chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@gmail.com
EMAIL_PASS=<gmail app password>
EMAIL_FROM=VaultGames <noreply@vaultgames.gg>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ANTHROPIC_API_KEY=sk-ant-...
CLIENT_URL=http://localhost:5173
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
```

```
# client/.env (create this file)

VITE_SERVER_URL=http://localhost:5000
```

---

## 📄 License

MIT — build freely, modify freely.
