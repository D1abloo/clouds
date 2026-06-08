#!/usr/bin/env bash
# Sincroniza OAuth y URLs PRO desde infra/.env.production.example → VPS infra/.env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${ROOT}/infra/.env.production.example"
REMOTE_HOST="${REMOTE_HOST:-root@82.223.54.195}"
REMOTE_ENV="/opt/cloudops/infra/.env"
PATCH_FILE="$(mktemp)"

cleanup() {
  rm -f "${PATCH_FILE}"
}
trap cleanup EXIT

if [ ! -f "${SOURCE}" ]; then
  echo "No se encontró ${SOURCE}" >&2
  exit 1
fi

grep -E '^(GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET|GITHUB_CLIENT_ID|GITHUB_CLIENT_SECRET|AUTH_URL|APP_URL|OAUTH_CALLBACK_URL)=' "${SOURCE}" > "${PATCH_FILE}"

echo "==> Parche OAuth ($(wc -l < "${PATCH_FILE}") vars) → ${REMOTE_HOST}"

rsync -az "${PATCH_FILE}" "${REMOTE_HOST}:/tmp/spendlyx-oauth.env"

ssh -o StrictHostKeyChecking=accept-new "${REMOTE_HOST}" python3 - <<'PY'
import pathlib
import re

target = pathlib.Path("/opt/cloudops/infra/.env")
patch = pathlib.Path("/tmp/spendlyx-oauth.env")
text = target.read_text()
updates = {}
for line in patch.read_text().splitlines():
    if not line.strip() or line.strip().startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    updates[key.strip()] = value

for key, value in updates.items():
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    line = f"{key}={value}"
    if pattern.search(text):
        text = pattern.sub(line, text, count=1)
    else:
        if not text.endswith("\n"):
            text += "\n"
        text += line + "\n"
    print(f"  ok: {key} ({len(value)} chars)")

target.write_text(text)
pathlib.Path("/tmp/spendlyx-oauth.env").unlink(missing_ok=True)
PY

ssh "${REMOTE_HOST}" "chmod 600 ${REMOTE_ENV} && cd /opt/cloudops/infra && docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env up -d --force-recreate backend-api frontend"

echo "==> Esperando API..."
for i in $(seq 1 24); do
  if curl -sS -m 5 https://spendlyx.com/api/v1/health >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

echo "==> OAuth en platform/status"
curl -sS -m 20 https://spendlyx.com/api/v1/platform/status | python3 -c "import sys,json; d=json.load(sys.stdin); o=d.get('oauth',{}); print('google:', o.get('google')); print('github:', o.get('github')); print('authUrl:', d.get('authUrl'))"
