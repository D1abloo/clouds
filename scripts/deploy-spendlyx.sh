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

echo "==> Forzando flags PRO/live en infra/.env"
grep -q '^APP_ENV=' .env && sed -i 's/^APP_ENV=.*/APP_ENV=production/' .env || echo 'APP_ENV=production' >> .env
grep -q '^DEMO_MODE=' .env && sed -i 's/^DEMO_MODE=.*/DEMO_MODE=false/' .env || echo 'DEMO_MODE=false' >> .env
grep -q '^PRO_MODE=' .env && sed -i 's/^PRO_MODE=.*/PRO_MODE=true/' .env || echo 'PRO_MODE=true' >> .env
grep -q '^AUTO_DEMO_SEED=' .env && sed -i 's/^AUTO_DEMO_SEED=.*/AUTO_DEMO_SEED=false/' .env || echo 'AUTO_DEMO_SEED=false' >> .env
grep -q '^INTEGRATIONS_LIVE=' .env && sed -i 's/^INTEGRATIONS_LIVE=.*/INTEGRATIONS_LIVE=true/' .env || echo 'INTEGRATIONS_LIVE=true' >> .env

echo "==> Limpiando cachés de build en el servidor..."
cd "${REMOTE_DIR}"
rm -rf .angular/cache apps/frontend-angular/.angular/cache node_modules/.cache apps/*/node_modules/.cache dist build .next apps/*/dist
if command -v npm >/dev/null 2>&1; then
  npm cache verify || true
fi

cd "${REMOTE_DIR}/infra"
echo "==> Asegurando swap de build sin tocar volúmenes de datos..."
if ! swapon --show | grep -q /swapfile-cloudops; then
  fallocate -l 4G /swapfile-cloudops
  chmod 600 /swapfile-cloudops
  mkswap /swapfile-cloudops >/dev/null
  swapon /swapfile-cloudops
  grep -q /swapfile-cloudops /etc/fstab || echo '/swapfile-cloudops none swap sw 0 0' >> /etc/fstab
fi

echo "==> Construyendo backend PRO sin caché..."
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env build --no-cache backend-api

echo "==> Construyendo frontend PRO sin caché..."
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env build --no-cache frontend

echo "==> Reiniciando contenedores PRO sin borrar volúmenes..."
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env up -d --force-recreate postgres redis backend-api frontend

for i in $(seq 1 48); do
  if docker compose -f docker-compose.yml -f docker-compose.production.yml exec -T backend-api wget -qO- http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1; then
    echo "==> API lista"
    break
  fi
  if [ "$i" -eq 48 ]; then
    echo "==> AVISO: API no respondió a tiempo; continuando con frontend"
  fi
  sleep 5
done

echo "==> Backup PostgreSQL antes de limpiar datos demo..."
mkdir -p /root/backups
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "/root/backups/spendlyx-pre-demo-cleanup-$(date +%Y%m%d-%H%M%S).sql" || echo "==> AVISO: backup PostgreSQL omitido"

echo "==> Limpieza acotada de datos demo (dry-run y ejecución confirmada)..."
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env exec -T backend-api \
  sh -c 'cd /app && npm run cleanup:demo:dry-run' || echo "==> AVISO: dry-run demo general no disponible"
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env exec -T backend-api \
  sh -c 'cd /app && CONFIRM_DELETE_DEMO_DATA=true npm run cleanup:demo:production' || echo "==> AVISO: limpieza demo general omitida"
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env exec -T backend-api \
  sh -c 'cd /app && npm run cleanup:vps-demo:dry-run' || echo "==> AVISO: dry-run VPS demo no disponible"
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env exec -T backend-api \
  sh -c 'cd /app && CONFIRM_DELETE_DEMO_VPS=true npm run cleanup:vps-demo:production' || echo "==> AVISO: limpieza VPS demo omitida"

docker compose -f docker-compose.yml -f docker-compose.production.yml ps
echo "Panel: https://spendlyx.com"
REMOTE

echo "==> Verificando platform/status"
curl -sS -m 25 https://spendlyx.com/api/v1/platform/status || true
echo ""
echo "==> Despliegue finalizado"
