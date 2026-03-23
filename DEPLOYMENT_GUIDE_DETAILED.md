# 🚀 VaultGames - Complete Step-by-Step Deployment Guide

**Last Updated:** March 2026  
**Version:** 3.0  
**Status:** Production-Ready

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Phase 1: Prepare Infrastructure](#phase-1-prepare-infrastructure)
3. [Phase 2: Prepare Application Code](#phase-2-prepare-application-code)
4. [Phase 3: Build & Deploy](#phase-3-build--deploy)
5. [Phase 4: Configuration & Testing](#phase-4-configuration--testing)
6. [Phase 5: Monitoring & Maintenance](#phase-5-monitoring--maintenance)
7. [Deployment Platforms](#deployment-platforms)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before starting deployment, complete this checklist:

**System Requirements:**
- [ ] Docker 20.10+ installed (`docker --version`)
- [ ] Docker Compose 2.0+ installed (`docker-compose --version`)
- [ ] Git installed (`git --version`)
- [ ] Domain name obtained and DNS configured
- [ ] Shell access to server (SSH)

**Third-Party Accounts & Credentials:**
- [ ] Google Cloud API key (for AI chatbot) - https://console.cloud.google.com
- [ ] Cloudinary account (for image uploads) - https://cloudinary.com
- [ ] Email service credentials:
  - [ ] Gmail with app password, OR
  - [ ] SendGrid API key, OR
  - [ ] Other SMTP provider
- [ ] SSL certificates (Let's Encrypt recommended)

**Code & Configuration:**
- [ ] Latest code committed to Git
- [ ] `.env.production` file template created
- [ ] nginx.prod.conf configured with your domain
- [ ] docker-compose.prod.yml reviewed
- [ ] Database backup strategy documented

---

# PHASE 1: Prepare Infrastructure

## 1.1 Server Setup

### Step 1: Access Your Server
```bash
# SSH into your production server
ssh -i your-key.pem ubuntu@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install required software
sudo apt install -y curl git build-essential
```

### Step 2: Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to Docker group
sudo usermod -aU docker $USER
newgrp docker

# Verify Docker installation
docker --version

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify Docker Compose
docker-compose --version
```

### Step 3: Create Project Directory
```bash
# Create and navigate to project directory
sudo mkdir -p /opt/vaultgames
cd /opt/vaultgames

# Set proper permissions
sudo chown $USER:$GROUP /opt/vaultgames
```

### Step 4: Configure Firewall
```bash
# Enable firewall
sudo ufw enable

# Allow SSH (important: do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verify firewall rules
sudo ufw status
```

---

## 1.2 SSL Certificate Setup (Let's Encrypt)

### Step 5: Install Certbot
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Create SSL directory
mkdir -p /opt/vaultgames/ssl
```

### Step 6: Generate SSL Certificates
```bash
# Navigate to project
cd /opt/vaultgames

# Option A: For domain (recommended)
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --non-interactive

# Option B: For subdomain
sudo certbot certonly --standalone \
  -d api.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --non-interactive
```

### Step 7: Copy Certificates to Project
```bash
# Copy certificates to SSL directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/vaultgames/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/vaultgames/ssl/key.pem

# Fix permissions
sudo chown $USER:$GROUP /opt/vaultgames/ssl/*.pem
chmod 600 /opt/vaultgames/ssl/*.pem

# Verify certificates
ls -la /opt/vaultgames/ssl/
```

### Step 8: Setup Certificate Auto-Renewal
```bash
# Add renewal cron job
sudo certbot renew --dry-run  # Test first

# Add to crontab (runs daily at 2 AM)
sudo bash -c 'echo "0 2 * * * /usr/bin/certbot renew --quiet --post-hook \"cd /opt/vaultgames && docker-compose -f docker-compose.prod.yml restart nginx\"" > /etc/cron.d/certbot-renewal'

# Verify cron job
sudo cat /etc/cron.d/certbot-renewal
```

---

# PHASE 2: Prepare Application Code

## 2.1 Clone & Setup Repository

### Step 9: Clone VaultGames Repository
```bash
# Clone repo into project directory
cd /opt/vaultgames
git clone https://github.com/your-username/vaultgames.git .

# Verify structure
ls -la  # Should show client/, server/, docker-compose.prod.yml, etc.
```

### Step 10: Generate JWT Secrets

**CRITICAL:** Use secure random strings for JWT secrets!

```bash
# Option 1: Using OpenSSL (recommended)
openssl rand -hex 32  # Copy output for JWT_ACCESS_SECRET
openssl rand -hex 32  # Copy output for JWT_REFRESH_SECRET

# Option 2: Using Node.js
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Using Python
python3 -c "import secrets; print('JWT_ACCESS_SECRET=' + secrets.token_hex(32))"
python3 -c "import secrets; print('JWT_REFRESH_SECRET=' + secrets.token_hex(32))"

# Save these values for next step
```

---

## 2.2 Environment Configuration

### Step 11: Create Production Environment File

```bash
# Create .env file for production
cat > /opt/vaultgames/.env.production << 'EOF'
# ═════════════════════════════════════════════════════════════
# VaultGames Production Environment Configuration
# ═════════════════════════════════════════════════════════════

# ──── Node.js ────
NODE_ENV=production
PORT=5000

# ──── Database ────
POSTGRES_PASSWORD=your_secure_postgres_password  # Change this!
DATABASE_URL=postgresql://postgres:your_secure_postgres_password@postgres:5432/vaultgames

# ──── Redis ────
REDIS_PASSWORD=your_secure_redis_password  # Change this!
REDIS_URL=redis://:your_secure_redis_password@redis:6379

# ──── JWT Secrets (from Step 10) ────
JWT_ACCESS_SECRET=your_32_character_hex_string_here
JWT_REFRESH_SECRET=your_32_character_hex_string_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ──── Email (configure for OTP sending) ────
# Option 1: Gmail SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password  # NOT your regular password!
EMAIL_FROM=VaultGames <noreply@vaultgames.gg>

# Option 2: SendGrid
# EMAIL_HOST=smtp.sendgrid.net
# EMAIL_PORT=587
# EMAIL_USER=apikey
# EMAIL_PASS=SG.your_sendgrid_api_key
# EMAIL_FROM=VaultGames <noreply@vaultgames.gg>

# ──── Cloudinary (Image Storage) ────
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ──── Google Gemini AI (AI Chatbot) ────
GOOGLE_API_KEY=AIzaSyD-your_google_api_key_here

# ──── Frontend Client URL ────
CLIENT_URL=https://yourdomain.com
VITE_SERVER_URL=https://yourdomain.com/api

# ──── Logging ────
LOG_LEVEL=info
EOF

# Review and update the file
nano .env.production
```

### Step 12: Update Nginx Configuration

```bash
# Update nginx configuration with your domain
sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN.COM/g' nginx.prod.conf
sed -i 's/your-domain.com/YOUR_ACTUAL_DOMAIN.COM/g' nginx.prod.conf

# Verify changes
grep "server_name" nginx.prod.conf | head -5
```

---

## 2.3 Database Configuration

### Step 13: Prepare Database Files (Optional Pre-seeding)

```bash
# If you have a SQL seed file
# cp your_seed.sql /opt/vaultgames/seeds/

# Database will initialize automatically when containers start
# Migrations run on server startup
```

---

# PHASE 3: Build & Deploy

## 3.1 Build Frontend

### Step 14: Build Production Frontend Bundle

```bash
cd /opt/vaultgames

# Install dependencies
npm install

# Navigate to client directory
cd client

# Install client dependencies
npm install

# Build production bundle
npm run build

# Verify build output
ls -la dist/  # Should see index.html and JS/CSS bundles

# Return to project root
cd /opt/vaultgames

# Check bundle size
du -sh client/dist/
```

## 3.2 Launch Containers

### Step 15: Start All Services

```bash
# Navigate to project directory
cd /opt/vaultgames

# Pull latest base images
docker-compose -f docker-compose.prod.yml pull

# Start all services (will build server image)
docker-compose -f docker-compose.prod.yml up -d

# Monitor startup
docker-compose -f docker-compose.prod.yml logs -f

# Wait 30-45 seconds for services to initialize
sleep 30
```

### Step 16: Verify All Services Started

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Expected output (all should be "Up"):
# NAME                      STATUS
# vault_postgres_prod       Up (healthy)
# vault_redis_prod          Up (healthy)
# vault_server_prod         Up (healthy)
# vault_nginx_prod          Up (healthy)
```

---

# PHASE 4: Configuration & Testing

## 4.1 Verify Services Health

### Step 17: Test Database Connections

```bash
# Test PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres
# Expected: "accepting connections"

# Test Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
# Expected: "PONG"

# Test backend health
curl http://localhost:5000/api/health
# Expected: {"status": "ok", "timestamp": "2026-03-22T..."}
```

### Step 18: Test Frontend Access

```bash
# Access frontend via IP (test nginx)
curl -I http://localhost/
# Expected: "200 OK" or "301 Moved Permanently" (redirect to HTTPS)

# Check frontend assets are served
curl -I http://localhost/index.html
```

### Step 19: Run Database Migrations

```bash
# Verify migrations ran (should be automatic)
docker-compose -f docker-compose.prod.yml exec server npx prisma migrate status

# If migrations didn't run, manually run them:
docker-compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
```

## 4.2 Test Core Functionality

### Step 20: Test User Registration

```bash
# Test registration endpoint
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123"
  }'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "user": { "id": "...", "username": "testuser", "email": "test@example.com" },
#     "accessToken": "eyJ0eXAi..."
#   }
# }
```

### Step 21: Test Login

```bash
# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123"
  }'

# Save the accessToken for next tests
```

### Step 22: Test Game Statistics API

```bash
# Replace BEARER_TOKEN with token from login
BEARER_TOKEN="your_token_here"

curl -X GET http://localhost:5000/api/games/stats \
  -H "Authorization: Bearer $BEARER_TOKEN"

# Expected: Game statistics object
```

### Step 23: Test Leaderboard

```bash
# Test public leaderboard (no auth required)
curl -X GET http://localhost:5000/api/games/leaderboard

# Expected: Array of top 10 players
```

---

## 4.3 Check Logs

### Step 24: Review Logs for Errors

```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs server --tail 50

# Check nginx logs
docker-compose -f docker-compose.prod.yml logs nginx --tail 50

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres --tail 20

# Search for errors
docker-compose -f docker-compose.prod.yml logs | grep -i "error"
```

---

# PHASE 5: Monitoring & Maintenance

## 5.1 Setup Monitoring

### Step 25: Configure Log Rotation

```bash
# Create Docker log configuration
sudo cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
EOF

# Restart Docker to apply changes
sudo systemctl restart docker
```

### Step 26: Monitor Resource Usage

```bash
# Real-time resource monitoring
docker stats vault_server_prod vault_postgres_prod vault_redis_prod

# Disk usage
docker system df

# Container details
docker inspect vault_server_prod | grep -i "memory\|cpu"
```

### Step 27: Setup Database Backups

```bash
# Create backup directory
mkdir -p /opt/vaultgames/backups

# Create backup script
cat > /opt/vaultgames/backup.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/vaultgames/backups"
mkdir -p $BACKUP_DIR

echo "Starting backup at $(date)..."

# Backup PostgreSQL
docker-compose -f /opt/vaultgames/docker-compose.prod.yml exec -T postgres pg_dump \
  -U postgres vaultgames > $BACKUP_DIR/vaultgames_$TIMESTAMP.sql

# Compress backup
gzip $BACKUP_DIR/vaultgames_$TIMESTAMP.sql

echo "Backup completed: $BACKUP_DIR/vaultgames_$TIMESTAMP.sql.gz"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "vaultgames_*.sql.gz" -mtime +7 -delete

echo "Old backups cleaned up."
EOF

# Make script executable
chmod +x /opt/vaultgames/backup.sh

# Test backup
/opt/vaultgames/backup.sh

# Add to crontab (daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/vaultgames/backup.sh >> /opt/vaultgames/backups/backup.log 2>&1") | crontab -

# Verify crontab
crontab -l | grep backup
```

### Step 28: Setup Monitoring & Alerting

**Option 1: Uptime Robot (Free)**
```bash
# 1. Create account: https://uptimerobot.com
# 2. Add monitoring for:
#    - https://yourdomain.com (frontend)
#    - https://yourdomain.com/api/health (backend)
# 3. Setup email alerts
```

**Option 2: Healthchecks.io (Free)**
```bash
# Create monitoring endpoint
# Use in your backup script:
curl -fsS -m 10 --retry 5 -o /dev/null -w "%{http_code}" \
  https://hc-ping.com/your-unique-id/backup
```

**Option 3: Self-Hosted Monitoring**
```bash
# Install Node.js monitoring (optional)
npm install -g pm2
npm install -g pm2-plus

# Monitor containers
pm2 monitor
```

---

## 5.2 Regular Maintenance

### Step 29: Daily Maintenance Tasks

```bash
# Daily (create cron job)
cat > /opt/vaultgames/daily-maintenance.sh << 'EOF'
#!/bin/bash
LOG="/opt/vaultgames/maintenance.log"
echo "=== Daily Maintenance $(date) ===" >> $LOG

# Check disk space
DISK_USAGE=$(df /opt/vaultgames | awk 'NR==2 {print $5}' | cut -d% -f1)
echo "Disk usage: $DISK_USAGE%" >> $LOG
if [ $DISK_USAGE -gt 80 ]; then
  echo "WARNING: Disk usage above 80%!" >> $LOG
fi

# Check Docker daemon
if ! systemctl is-active --quiet docker; then
  echo "ERROR: Docker daemon not running!" >> $LOG
  systemctl start docker
fi

# Cleanup old images (optional)
docker image prune -f --filters "until=720h" >> $LOG 2>&1

# Cleanup dangling volumes
docker volume prune -f >> $LOG 2>&1

echo "Maintenance completed" >> $LOG
EOF

chmod +x /opt/vaultgames/daily-maintenance.sh

# Add to crontab (daily at 4 AM)
(crontab -l 2>/dev/null; echo "0 4 * * * /opt/vaultgames/daily-maintenance.sh") | crontab -
```

### Step 30: Weekly Update Check

```bash
# Create update check script
cat > /opt/vaultgames/check-updates.sh << 'EOF'
#!/bin/bash
echo "Checking for updates..."

# Check for system updates
apt list --upgradable

# Check Docker images for updates
docker pull postgres:16-alpine
docker pull redis:7-alpine
docker pull nginx:alpine
docker pull node:20-alpine

echo "Update check completed. Review above for important updates."
EOF

chmod +x /opt/vaultgames/check-updates.sh
```

---

## 5.3 Update Process

### Step 31: Deploy Code Updates

```bash
# Pull latest code
cd /opt/vaultgames
git pull origin main

# Rebuild client bundle
cd client
npm install
npm run build
cd /opt/vaultgames

# Rebuild backend image
docker-compose -f docker-compose.prod.yml build --no-cache server

# Restart services (zero-downtime if using load balancer)
docker-compose -f docker-compose.prod.yml up -d

# Verify services
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f server --tail 20
```

### Step 32: Run Database Migrations (if any)

```bash
# Check migration status
docker-compose -f docker-compose.prod.yml exec server npx prisma migrate status

# Deploy pending migrations
docker-compose -f docker-compose.prod.yml exec server npx prisma migrate deploy

# Verify migrations
docker-compose -f docker-compose.prod.yml exec server npx prisma migrate status
```

### Step 33: Rollback Procedure

```bash
# If something goes wrong, rollback quickly:

# 1. Restore from database backup
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres vaultgames < backups/vaultgames_YYYYMMDD_HHMMSS.sql.gz

# 2. Checkout previous commit
git checkout previous_commit_hash

# 3. Rebuild and restart
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify
docker-compose -f docker-compose.prod.yml ps
```

---

# Deployment Platforms

## Option 1: Railway.app (Recommended for Beginners)

### Setup on Railway:
```bash
# 1. Create account at https://railway.app
# 2. Connect GitHub repository
# 3. Create PostgreSQL plugin
# 4. Create Redis plugin
# 5. Configure environment variables
# 6. Deploy from Git (auto-deploys on push)

# View logs:
# Railway Dashboard → select service → Logs
```

**Advantages:**
- ✅ Easy setup (5 minutes)
- ✅ Auto-deploys on Git push
- ✅ Included PostgreSQL and Redis
- ✅ Free tier available
- ✅ Auto SSL certificates

---

## Option 2: Render.com

### Setup on Render:
```bash
# 1. Create account at https://render.com
# 2. Create Web Service from Git
# 3. Set build command: npm install && npm run build
# 4. Set start command: npm start
# 5. Add PostgreSQL database
# 6. Add Redis instance
# 7. Link databases
```

---

## Option 3: AWS (For Scale)

### Architecture:
```
Route 53 (DNS)
    ↓
CloudFront (CDN)
    ↓
    ├─→ S3 (Static Frontend)
    └─→ ALB (Load Balancer)
         ├─→ ECS (Backend Containers)
         ├─→ RDS (PostgreSQL)
         ├─→ ElastiCache (Redis)
         └─→ CloudWatch (Monitoring)
```

### Deployment Steps:
```bash
# 1. Create RDS PostgreSQL instance
# 2. Create ElastiCache Redis cluster
# 3. Create ECS cluster
# 4. Push Docker images to ECR
# 5. Create task definitions
# 6. Create ALB and target groups
# 7. Configure CloudFront
# 8. Setup Route 53

# Complex setup, but highly scalable
```

---

## Option 4: DigitalOcean App Platform

### Setup:
```bash
# 1. Create account at https://www.digitalocean.com
# 2. Create App with GitHub
# 3. Configure PostgreSQL database
# 4. Configure environment
# 5. Deploy

# Simple alternative to Render/Railway
```

---

# Troubleshooting

## Common Issues & Solutions

### 1. Backend Not Starting - Database Connection Error

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check if postgres is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check postgres logs
docker-compose -f docker-compose.prod.yml logs postgres

# Restart postgres
docker-compose -f docker-compose.prod.yml restart postgres

# Wait for it to be healthy
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

# Then restart server
docker-compose -f docker-compose.prod.yml restart server
```

---

### 2. Nginx 502 Bad Gateway

**Symptoms:**
```
502 Bad Gateway error when accessing https://yourdomain.com
```

**Solution:**
```bash
# Check backend health
curl http://localhost:5000/api/health

# Check server is running
docker-compose -f docker-compose.prod.yml ps server

# Check nginx logs
docker-compose -f docker-compose.prod.yml logs nginx

# Verify backend is exposed correctly
docker-compose -f docker-compose.prod.yml exec server curl localhost:5000/api/health

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

---

### 3. SSL Certificate Issues

**Symptoms:**
```
SSL_ERROR_RX_RECORD_TOO_LONG or ERR_SSL_PROTOCOL_ERROR
```

**Solution:**
```bash
# Check certificate exists and is readable
ls -la /opt/vaultgames/ssl/
openssl x509 -in /opt/vaultgames/ssl/cert.pem -noout -text

# Check nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Verify certificate renewal
sudo certbot certificates

# Manual renewal
sudo certbot renew --force-renewal

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

---

### 4. Out of Disk Space

**Symptoms:**
```
write: no space left on device
```

**Solution:**
```bash
# Check disk usage
df -h

# Find large files
du -sh /opt/vaultgames/* | sort -h

# Cleanup Docker
docker system prune -a --volumes

# Cleanup logs
docker-compose -f docker-compose.prod.yml logs --tail 100 > /opt/vaultgames/logs/archived.log
docker-compose -f docker-compose.prod.yml logs --tail 0 > /dev/null

# Remove old backups
find /opt/vaultgames/backups -mtime +30 -delete

# Check again
df -h
```

---

### 5. High Memory Usage

**Symptoms:**
```
Server crashes due to memory exhaustion
```

**Solution:**
```bash
# Check memory usage
docker stats

# Increase container memory limits (edit docker-compose.prod.yml):
# server:
#   ...
#   deploy:
#     resources:
#       limits:
#         memory: 2G

# Restart containers
docker-compose -f docker-compose.prod.yml up -d

# Monitor Node.js memory
docker-compose -f docker-compose.prod.yml exec server node -e "console.log(require('os').totalmem() / 1024 / 1024 / 1024, 'GB')"
```

---

### 6. Database Locked

**Symptoms:**
```
PG::LockNotAvailable: ERROR: could not obtain lock
```

**Solution:**
```bash
# Check active connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres vaultgames -c "SELECT * FROM pg_stat_activity WHERE datname = 'vaultgames';"

# Kill idle connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres vaultgames -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'vaultgames' AND state = 'idle';"

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

---

### 7. Redis Connection Issues

**Symptoms:**
```
Error: ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
```bash
# Check Redis is running
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Check Redis password
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a your_redis_password ping

# Clear Redis cache (if needed)
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL

# Restart Redis
docker-compose -f docker-compose.prod.yml restart redis
```

---

## Performance Troubleshooting

### High Response Times

```bash
# Check database query performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres vaultgames -c "\timing" -c "SELECT * FROM game_history LIMIT 10;"

# Check backend CPU usage
docker stats vault_server_prod

# Check slow queries
docker-compose -f docker-compose.prod.yml logs server | grep "slow"

# Enable query logging (temporary)
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres vaultgames -c "ALTER DATABASE vaultgames SET log_statement = 'all';"
```

---

## Emergency Procedures

### Complete System Reset
```bash
# WARNING: This will delete all data!

# Stop all services
docker-compose -f docker-compose.prod.yml down -v

# Remove all volumes
docker volume prune -a -f

# Remove images
docker rmi vault_server_prod nginx:alpine

# Start fresh
docker-compose -f docker-compose.prod.yml up -d
```

### Disaster Recovery Checklist
```bash
# 1. Verify backups exist
ls -lah /opt/vaultgames/backups/

# 2. Test restore on test database
docker-compose exec postgres createdb vaultgames_test
gunzip -c backups/latest.sql.gz | docker-compose exec -T postgres psql -U postgres vaultgames_test

# 3. Create disaster recovery runbook
# 4. Schedule monthly recovery drills
# 5. Document any issues found
```

---

## Success Checklist

After completing deployment, verify:

- [ ] All services running (`docker-compose ps`)
- [ ] Frontend accessible at `https://yourdomain.com`
- [ ] Backend health check passing (`curl https://yourdomain.com/api/health`)
- [ ] User registration working
- [ ] Database migrations completed
- [ ] SSL certificate valid
- [ ] Backups automated and tested
- [ ] Monitoring alerts configured
- [ ] Error tracking setup (Sentry)
- [ ] Performance baseline recorded
- [ ] Security audit completed
- [ ] Team trained on deployment process
- [ ] Runbooks documented

---

## Support Resources

- **VaultGames Documentation:** See COMPREHENSIVE_AUDIT.md
- **Docker Docs:** https://docs.docker.com
- **Let's Encrypt:** https://letsencrypt.org
- **Railway Deployment:** https://railway.app/docs
- **Prisma Migration:** https://www.prisma.io/docs/orm/prisma-migrate/getting-started

---

**Last Updated:** March 22, 2026  
**Deployment Status:** ✅ Production-Ready
