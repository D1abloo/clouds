#!/usr/bin/env bash
set -euo pipefail
echo "CloudOps dev-up — ver Fase 13 para implementación completa"
docker compose -f infra/docker-compose.yml up -d
