#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-time database initialisation — run this via SSH after the first deploy.
#
# Usage (from your app root on the Hostinger server):
#   bash scripts/setup-db.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "→ Creating prisma/ directory if needed..."
mkdir -p prisma

echo "→ Running Prisma migrations..."
npx prisma migrate deploy

echo "✓ Database ready at $(pwd)/prisma/prod.db"
