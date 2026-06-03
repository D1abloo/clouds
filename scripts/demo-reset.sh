#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [[ -f .env ]]; then set -a; source .env; set +a; fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  export DATABASE_URL="postgresql://cloudops:cloudops_dev_password@localhost:5432/cloudops"
fi
echo "==> CloudOps — demo:reset (clear demo + reload)"
./scripts/seed.sh
npm run prisma:seed:demo:reset -w apps/backend-api
echo "==> Demo reset complete. Login: demo@cloudops.local / Demo1234!"
