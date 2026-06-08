#!/usr/bin/env bash
# Verificación PRO en VPS — últimos 4 prompts (UX sidebar, demo cleanup, módulos, favoritos)
set -euo pipefail

BASE="${BASE_URL:-https://spendlyx.com}"
API="${BASE}/api/v1"
PASS=0
FAIL=0
WARN=0

ok() { echo "✅ $1"; PASS=$((PASS + 1)); }
bad() { echo "❌ $1"; FAIL=$((FAIL + 1)); }
warn() { echo "⚠️  $1"; WARN=$((WARN + 1)); }

echo "==> Spendlyx PRO — verificación VPS"
echo "    URL: ${BASE}"
echo "    Fecha: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# --- 1. Platform status ---
echo "--- 1. Estado PRO ---"
STATUS=$(curl -sf -m 20 "${API}/platform/status" || echo '{}')
echo "${STATUS}" | grep -q '"demoMode":false' && ok "demoMode=false" || bad "demoMode no es false"
echo "${STATUS}" | grep -q '"proMode":true' && ok "proMode=true" || bad "proMode no es true"
echo "${STATUS}" | grep -q '"appEnv":"production"' && ok "appEnv=production" || bad "appEnv no es production"
echo ""

# --- 2. Login page HTML ---
echo "--- 2. Login (sin demo en PRO) ---"
LOGIN_HTML=$(curl -sf -m 20 "${BASE}/login" || echo '')
[[ -n "${LOGIN_HTML}" ]] && ok "Página /login responde" || bad "Página /login no responde"
echo "${LOGIN_HTML}" | grep -qi "Entrar en modo demo" && bad "Botón demo visible en login" || ok "Sin botón «Entrar en modo demo»"
echo "${LOGIN_HTML}" | grep -q "Staging Env" && bad "Staging Env en login" || ok "Sin Staging Env"
echo ""

# --- 3. Bundle PRO (strings prohibidos) ---
echo "--- 3. Bundle frontend (strings prohibidos) ---"
MAIN_JS=$(curl -sf -m 30 "${BASE}/" | grep -oE 'main-[A-Z0-9]+\.js' | head -1 || true)
if [[ -z "${MAIN_JS}" ]]; then
  warn "No se detectó main-*.js en index (puede ser lazy)"
else
  BUNDLE=$(curl -sf -m 60 "${BASE}/${MAIN_JS}" || echo '')
  [[ -n "${BUNDLE}" ]] && ok "Bundle ${MAIN_JS} descargado" || bad "No se pudo descargar bundle"
  for term in "WebSocket offline" "Staging Env" "Puedes usar modo demo" "sin credenciales reales" "org-switcher"; do
    echo "${BUNDLE}" | grep -q "${term}" && bad "Bundle contiene: ${term}" || ok "Bundle sin: ${term}"
  done
  echo "${BUNDLE}" | grep -q "Esta integración aún no está conectada. Añade las credenciales en Configuración para comenzar a usarla en modo PRO." \
    && bad "Mensaje genérico largo en bundle" \
    || ok "Sin mensaje genérico largo de integración"
fi
echo ""

# --- 4. Rutas protegidas ---
echo "--- 4. Rutas protegidas ---"
REDIR=$(curl -sf -m 15 -o /dev/null -w '%{redirect_url}' "${BASE}/dashboard" || echo '')
echo "${REDIR}" | grep -q 'login' && ok "/dashboard redirige a login sin sesión" || warn "Redirect dashboard: ${REDIR}"
echo ""

# --- 5. API notificaciones (auth requerida) ---
echo "--- 5. API notificaciones ---"
NOTIF_CODE=$(curl -sf -m 15 -o /dev/null -w '%{http_code}' "${API}/notifications/unread-summary" || echo '000')
[[ "${NOTIF_CODE}" == "401" || "${NOTIF_CODE}" == "403" ]] && ok "unread-summary requiere auth (${NOTIF_CODE})" || warn "unread-summary HTTP ${NOTIF_CODE}"
echo ""

# --- 6. Health ---
echo "--- 6. Health ---"
curl -sf -m 15 "${API}/health" >/dev/null && ok "API health OK" || bad "API health falló"
echo ""

echo "==> Resumen: ${PASS} OK, ${FAIL} fallos, ${WARN} avisos"
if [[ "${FAIL}" -gt 0 ]]; then exit 1; fi
exit 0
