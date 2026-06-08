#!/usr/bin/env bash
# Despliegue rápido Spendlyx PRO (spendlyx.com) tras cambios en GitHub
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@82.223.54.195}"
REMOTE_DIR="${REMOTE_DIR:-/opt/cloudops}"
REPO_URL="${REPO_URL:-https://github.com/D1abloo/clouds.git}"
BRANCH="${BRANCH:-pro-clean-cutover}"

echo "==> Despliegue Spendlyx (${BRANCH}) en ${REMOTE_HOST}"

ssh -o StrictHostKeyChecking=accept-new "${REMOTE_HOST}" bash -s <<REMOTE
set -euo pipefail
REMOTE_DIR="${REMOTE_DIR}"
REPO_URL="${REPO_URL}"
BRANCH="${BRANCH}"

mkdir -p "\${REMOTE_DIR}"

if [ ! -d "\${REMOTE_DIR}/.git" ]; then
  echo "==> Primera sincronización git (preservando infra/.env y certs)"
  BACKUP="/tmp/cloudops-infra-\$(date +%s)"
  if [ -d "\${REMOTE_DIR}/infra" ]; then
    cp -a "\${REMOTE_DIR}/infra" "\${BACKUP}"
  fi
  rm -rf "\${REMOTE_DIR}"/*
  git clone --branch "\${BRANCH}" --depth 1 "\${REPO_URL}" "\${REMOTE_DIR}"
  if [ -d "\${BACKUP}" ]; then
    cp -a "\${BACKUP}/.env" "\${REMOTE_DIR}/infra/.env" 2>/dev/null || true
    cp -a "\${BACKUP}/certs" "\${REMOTE_DIR}/infra/certs" 2>/dev/null || true
    rm -rf "\${BACKUP}"
  fi
else
  cd "\${REMOTE_DIR}"
  git fetch origin "\${BRANCH}"
  git checkout "\${BRANCH}"
  git pull --ff-only origin "\${BRANCH}"
fi

cd "\${REMOTE_DIR}/infra"
test -f .env || { echo "ERROR: falta infra/.env en el servidor"; exit 1; }

echo "==> Reconstruyendo stack PRO..."
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env up -d --build postgres redis backend-api frontend

echo "==> Esperando API..."
for i in \$(seq 1 36); do
  if docker compose -f docker-compose.yml -f docker-compose.production.yml exec -T backend-api wget -qO- http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1; then
    echo "==> API lista"
    break
  fi
  sleep 5
done

docker compose -f docker-compose.yml -f docker-compose.production.yml ps
echo "Panel: https://spendlyx.com"
REMOTE

echo "==> Verificando https://spendlyx.com/api/v1/platform/status"
curl -sS -m 25 https://spendlyx.com/api/v1/platform/status || true
echo ""
echo "==> Despliegue finalizado"
