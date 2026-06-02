#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> CloudOps — base seed + demo data"

./scripts/seed.sh
npm run prisma:seed:demo -w apps/backend-api

echo "==> Demo seed complete"
