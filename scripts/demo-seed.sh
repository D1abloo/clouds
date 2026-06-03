#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [[ -f .env ]]; then set -a; source .env; set +a; fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  export DATABASE_URL="postgresql://cloudops:cloudops_dev_password@localhost:5432/cloudops"
fi
echo "==> CloudOps — demo:seed (base + demo dataset)"
./scripts/seed.sh
npm run prisma:seed:demo -w apps/backend-api
echo "==> Demo seed complete. Login: demo@cloudops.local / Demo1234!"
