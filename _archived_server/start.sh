#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx prisma db seed || echo "Seed skipped or already completed"

echo "Starting server..."
exec node dist/index.js
