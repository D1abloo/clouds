#!/usr/bin/env bash
# Levanta Postgres/Redis, aplica migración GitHub y siembra repos demo.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then set -a; source .env; set +a; fi
export DATABASE_URL="${DATABASE_URL:-postgresql://cloudops:cloudops_dev_password@localhost:5432/cloudops}"

echo "==> Docker: postgres + redis"
docker compose -f infra/docker-compose.yml up -d postgres redis

echo "==> Esperando PostgreSQL…"
for i in $(seq 1 30); do
  if docker exec cloudops-postgres pg_isready -U cloudops -d cloudops >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Prisma migrate (GitHub + tablas)"
npm run prisma:generate -w apps/backend-api
cd apps/backend-api
npx prisma migrate deploy
cd "$ROOT"

echo "==> Seed demo (incluye 8 repos GitHub ficticios)"
npm run prisma:seed:demo -w apps/backend-api

echo "==> Verificar catálogo demo"
npm run github:demo:verify -w apps/backend-api

echo ""
echo "✓ GitHub demo listo."
echo "  Login UI: admin@cloudops.local / Admin123!"
echo "  API: GET /api/v1/github/demo/repos"
echo "  Prueba API (con backend en :3000): npm run github:demo:test -w apps/backend-api"
