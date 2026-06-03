#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${FRONTEND_PORT:-4200}"

# Evita dos ng serve en el mismo puerto (uno suele quedar con build antiguo)
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti ":${PORT}" 2>/dev/null || true)
  if [[ -n "${PIDS}" ]]; then
    kill ${PIDS} 2>/dev/null || true
    sleep 1
  fi
fi

cd "${ROOT}"
exec npm run start -w apps/frontend-angular
