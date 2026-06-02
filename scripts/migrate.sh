#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> CloudOps — database migrations"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  export DATABASE_URL="postgresql://cloudops:cloudops_dev_password@localhost:5432/cloudops"
  echo "DATABASE_URL not set; using local default"
fi

npm run prisma:generate -w apps/backend-api

if [[ "${1:-}" == "deploy" ]]; then
  npx prisma migrate deploy --schema=apps/backend-api/prisma/schema.prisma
else
  npm run prisma:migrate -w apps/backend-api
fi

echo "==> Migrations complete"
