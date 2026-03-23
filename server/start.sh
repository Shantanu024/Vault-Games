#!/bin/bash
set -e

echo "Starting VaultGames server..."

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy || echo "Migrations already applied or no pending migrations"

# Start the application
echo "Starting application..."
exec node dist/index.js
