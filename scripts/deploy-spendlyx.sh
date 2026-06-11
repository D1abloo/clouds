#!/usr/bin/env bash
# Despliegue Spendlyx PRO: sincroniza código local → servidor y reconstruye Docker
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-root@82.223.54.195}"
REMOTE_DIR="${REMOTE_DIR:-/opt/cloudops}"

# Certificados SSL (no están en git)
if [ ! -f "${ROOT}/infra/certs/fullchain.pem" ]; then
  bash "${ROOT}/scripts/setup-domain-certs.sh"
fi

echo "==> Sincronizando código a ${REMOTE_HOST}:${REMOTE_DIR}"

rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'apps/*/dist' \
  --exclude 'apps/*/node_modules' \
  --exclude 'infra/.env' \
  --exclude 'certificado' \
  --exclude '.cursor' \
  "${ROOT}/" "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "==> Sincronizando certificados SSL"
rsync -az "${ROOT}/infra/certs/" "${REMOTE_HOST}:${REMOTE_DIR}/infra/certs/"

echo "==> Asegurando infra/.env en el servidor"

ssh -o StrictHostKeyChecking=accept-new "${REMOTE_HOST}" bash -s <<'REMOTE'
set -euo pipefail
REMOTE_DIR="/opt/cloudops"
mkdir -p "${REMOTE_DIR}/infra/certs"
cd "${REMOTE_DIR}/infra"

if [ ! -f .env ]; then
  echo "==> Creando infra/.env desde contenedor en ejecución"
  DB_PASS=$(docker exec cloudops-backend printenv POSTGRES_PASSWORD 2>/dev/null || openssl rand -hex 16)
  JWT=$(docker exec cloudops-backend printenv JWT_SECRET 2>/dev/null || openssl rand -hex 32)
  AUTH=$(docker exec cloudops-backend printenv AUTH_SECRET 2>/dev/null || openssl rand -hex 32)
  ENC=$(docker exec cloudops-backend printenv ENCRYPTION_KEY 2>/dev/null || openssl rand -hex 32)
  cat > .env <<ENV
PUBLIC_URL=https://spendlyx.com
CORS_ORIGIN=https://spendlyx.com,https://www.spendlyx.com
AUTH_URL=https://spendlyx.com
APP_URL=https://spendlyx.com
OAUTH_CALLBACK_URL=https://spendlyx.com/api/v1/auth/oauth/callback
JWT_SECRET=${JWT}
AUTH_SECRET=${AUTH}
ENCRYPTION_KEY=${ENC}
VAULT_ENCRYPTION_KEY=${ENC}
POSTGRES_PASSWORD=${DB_PASS}
DATABASE_URL=postgresql://cloudops:${DB_PASS}@postgres:5432/cloudops
APP_ENV=production
DEMO_MODE=false
PRO_MODE=true
AUTO_DEMO_SEED=false
INTEGRATIONS_LIVE=true
LOG_LEVEL=info
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-1
GCP_PROJECT_ID=
GCP_SERVICE_ACCOUNT_JSON=
IONOS_VPS_HOST=
IONOS_VPS_PORT=22
IONOS_VPS_USER=root
IONOS_VPS_SSH_KEY=
ENV
  chmod 600 .env
fi

echo "==> Reconstruyendo stack PRO..."
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env up -d --build postgres redis backend-api

for i in $(seq 1 48); do
  if docker compose -f docker-compose.yml -f docker-compose.production.yml exec -T backend-api wget -qO- http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1; then
    echo "==> API lista"
    break
  fi
  sleep 5
done

echo "==> Reconstruyendo imagen frontend (sin caché)..."
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env build --no-cache frontend
echo "==> Reiniciando contenedor frontend..."
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env up -d --force-recreate frontend

docker compose -f docker-compose.yml -f docker-compose.production.yml ps
echo "Panel: https://spendlyx.com"
REMOTE

echo "==> Verificando platform/status"
curl -sS -m 25 https://spendlyx.com/api/v1/platform/status || true
echo ""
echo "==> Despliegue finalizado"
