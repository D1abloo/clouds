#!/usr/bin/env bash
# Despliegue PRO en servidor remoto vía SSH
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@82.223.54.195}"
REMOTE_DIR="${REMOTE_DIR:-/opt/cloudops}"
REPO_URL="${REPO_URL:-https://github.com/D1abloo/clouds.git}"
BRANCH="${BRANCH:-main}"

echo "==> Despliegue PRO CloudOps en ${REMOTE_HOST}"

ssh -o StrictHostKeyChecking=accept-new "${REMOTE_HOST}" bash -s <<REMOTE
set -euo pipefail
REMOTE_DIR="${REMOTE_DIR}"
REPO_URL="${REPO_URL}"
BRANCH="${BRANCH}"

apt-get update -qq
apt-get install -y -qq git curl openssl ca-certificates >/dev/null 2>&1 || true

mkdir -p "\${REMOTE_DIR}"
if [ -d "\${REMOTE_DIR}/.git" ]; then
  cd "\${REMOTE_DIR}"
  git fetch origin
  git checkout "\${BRANCH}"
  git pull --ff-only origin "\${BRANCH}"
else
  git clone --branch "\${BRANCH}" --depth 1 "\${REPO_URL}" "\${REMOTE_DIR}"
  cd "\${REMOTE_DIR}"
fi

cd "\${REMOTE_DIR}/infra"

if [ ! -f .env ]; then
  JWT_SECRET=\$(openssl rand -hex 32)
  AUTH_SECRET=\$(openssl rand -hex 32)
  ENC_KEY=\$(openssl rand -hex 16)\$(openssl rand -hex 16)
  DB_PASS=\$(openssl rand -hex 16)
  cat > .env <<ENV
PUBLIC_URL=http://82.223.54.195
CORS_ORIGIN=http://82.223.54.195
AUTH_URL=http://82.223.54.195
OAUTH_CALLBACK_URL=http://82.223.54.195/auth/callback
JWT_SECRET=\${JWT_SECRET}
AUTH_SECRET=\${AUTH_SECRET}
ENCRYPTION_KEY=\${ENC_KEY}
VAULT_ENCRYPTION_KEY=\${ENC_KEY}
POSTGRES_PASSWORD=\${DB_PASS}
DATABASE_URL=postgresql://cloudops:\${DB_PASS}@postgres:5432/cloudops
DEMO_MODE=false
PRO_MODE=true
AUTO_DEMO_SEED=false
INTEGRATIONS_LIVE=true
LOG_LEVEL=info
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-1
AWS_ACCOUNT_ID=
GCP_PROJECT_ID=
GCP_SERVICE_ACCOUNT_JSON=
IONOS_VPS_HOST=
IONOS_VPS_PORT=22
IONOS_VPS_USER=root
IONOS_VPS_SSH_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
ENV
  chmod 600 .env
  echo "==> Creado infra/.env con secretos generados (rellena AWS/GCP/Ionos)"
else
  echo "==> Usando infra/.env existente"
fi

# Sincronizar contraseña Postgres vía .env (docker-compose usa \${POSTGRES_PASSWORD})

echo "==> Construyendo y levantando stack PRO..."
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env up -d --build postgres redis backend-api frontend

echo "==> Esperando API..."
for i in \$(seq 1 60); do
  if docker compose -f docker-compose.yml -f docker-compose.production.yml exec -T backend-api wget -qO- http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1; then
    echo "==> API lista"
    break
  fi
  sleep 5
done

echo "==> Provisionando cuentas cloud/VPS si hay credenciales en .env..."
docker compose -f docker-compose.yml -f docker-compose.production.yml exec -T backend-api node /app/scripts/provision-pro-resources.js 2>/dev/null || echo "(provision omitido o pendiente de credenciales)"

docker compose -f docker-compose.yml -f docker-compose.production.yml ps
echo ""
echo "Panel: http://82.223.54.195"
echo "Login: admin@cloudops.local / Admin123!"
REMOTE

echo "==> Despliegue finalizado"
