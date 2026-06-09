#!/usr/bin/env bash
# Sincroniza credenciales AWS/GCP desde infra/.env.cloud → VPS (sin commitear secretos).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${ROOT}/infra/.env.cloud"
REMOTE_HOST="${REMOTE_HOST:-root@82.223.54.195}"
REMOTE_ENV="/opt/cloudops/infra/.env"

if [ ! -f "${SOURCE}" ]; then
  echo "Crea ${SOURCE} desde infra/.env.cloud.example con tus credenciales reales." >&2
  exit 1
fi

PATCH="$(mktemp)"
trap 'rm -f "${PATCH}"' EXIT

grep -E '^(AWS_|GCP_)' "${SOURCE}" > "${PATCH}"

if ! grep -q 'AWS_ACCESS_KEY_ID=.\+' "${PATCH}" 2>/dev/null; then
  echo "Advertencia: AWS_ACCESS_KEY_ID vacío en ${SOURCE}" >&2
fi
if ! grep -q 'GCP_SERVICE_ACCOUNT_JSON=.\+' "${PATCH}" 2>/dev/null; then
  echo "Advertencia: GCP_SERVICE_ACCOUNT_JSON vacío en ${SOURCE}" >&2
fi

echo "==> Sincronizando credenciales cloud → ${REMOTE_HOST}"
rsync -az "${PATCH}" "${REMOTE_HOST}:/tmp/spendlyx-cloud.env"

ssh "${REMOTE_HOST}" python3 - <<'PY'
import pathlib
import re

target = pathlib.Path("/opt/cloudops/infra/.env")
patch = pathlib.Path("/tmp/spendlyx-cloud.env")
text = target.read_text()
updates = {}
for line in patch.read_text().splitlines():
    if not line.strip() or line.strip().startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    updates[key.strip()] = value

for key, value in updates.items():
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    if pattern.search(text):
        text = pattern.sub(f"{key}={value}", text)
    else:
        text = text.rstrip() + f"\n{key}={value}\n"

target.write_text(text)
print(f"Actualizadas {len(updates)} variables cloud en {target}")
PY

echo "==> Recreando backend para cargar credenciales"
ssh "${REMOTE_HOST}" 'cd /opt/cloudops/infra && docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env up -d --force-recreate backend-api'

echo "==> Registrando cuentas cloud en PostgreSQL"
ssh "${REMOTE_HOST}" 'docker exec cloudops-backend node scripts/provision-pro-resources.js'

echo "==> Listo. Valida en el panel: Nubes → AWS/GCP → Cuentas"
