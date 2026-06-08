#!/bin/sh
set -e

echo "==> CloudOps API — database setup"
sleep 3

echo "==> Running migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

if [ "${DEMO_MODE:-true}" = "false" ]; then
  export SEED_MODE=production
fi

echo "==> Base seed (roles, admin user)..."
npx prisma db seed --schema=./prisma/schema.prisma 2>/dev/null || echo "Prisma seed skipped, running ensure-users..."
echo "==> Ensuring default login users..."
node /app/ensure-users.js

if [ "${AUTO_DEMO_SEED:-true}" = "true" ] && [ "${DEMO_MODE:-true}" = "true" ]; then
  echo "==> Checking demo dataset..."
  node <<'NODE'
const { PrismaClient } = require('@prisma/client')
const { seedDemoData } = require('./dist/prisma/seed-demo')

const run = async () => {
  const prisma = new PrismaClient()
  try {
    const count = await prisma.instance.count({ where: { deletedAt: null } })
    if (count < 5) {
      console.log('==> Auto-loading demo dataset...')
      await seedDemoData({ clearFirst: false }, prisma)
      console.log('==> Demo dataset loaded')
    } else {
      console.log(`==> Demo data present (${count} instances)`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

run().catch((e) => {
  console.error('Demo auto-seed failed:', e.message)
  process.exit(1)
})
NODE
fi

echo "==> Starting API on port ${API_PORT:-3000}..."
exec node dist/src/main.js
