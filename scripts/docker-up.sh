#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/infra"
echo "==> CloudOps — Docker stack (postgres, redis, API, frontend)"
docker compose up -d --build postgres redis backend-api frontend
echo ""
echo "Frontend:  http://localhost:8080"
echo "API:       http://localhost:3001/api/v1"
echo "Swagger:   http://localhost:3001/api/docs"
echo "Login:     admin@cloudops.local / Admin123!"
echo "Demo user: demo@cloudops.local / Demo1234!"
