#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> CloudOps — seed database"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  export DATABASE_URL="postgresql://cloudops:cloudops_dev_password@localhost:5432/cloudops"
fi

npm run prisma:generate -w apps/backend-api
npm run prisma:seed -w apps/backend-api

echo "==> Seed complete"
