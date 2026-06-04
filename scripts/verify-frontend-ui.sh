#!/usr/bin/env bash
# Verifica que el frontend sirve el design system Fase 24 (borderless / premium-table).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MARKERS=(premium-table soft-tabs table-card summary-card--elevated)
DEV_PORT="${FRONTEND_PORT:-4200}"
DOCKER_PORT="${DOCKER_FRONTEND_PORT:-8080}"
FAIL=0

check_port() {
  local port="$1"
  local label="$2"
  local css_url=""

  if ! curl -sf "http://localhost:${port}/" >/dev/null 2>&1; then
    echo "⚠️  ${label} (:${port}) — no responde"
    return 1
  fi

  if curl -sf "http://localhost:${port}/styles.css" | grep -q premium-table 2>/dev/null; then
    css_url="http://localhost:${port}/styles.css"
  else
    css_url=$(curl -sf "http://localhost:${port}/" | grep -oE 'styles-[A-Z0-9]+\.css' | head -1 || true)
    css_url="${css_url:+http://localhost:${port}/${css_url}}"
  fi

  if [[ -z "${css_url}" ]]; then
    echo "❌ ${label} (:${port}) — no se encontró CSS"
    FAIL=1
    return 1
  fi

  local hits=0
  local css
  css=$(curl -sf "${css_url}")
  for m in "${MARKERS[@]}"; do
    if echo "${css}" | grep -q "${m}"; then
      hits=$((hits + 1))
    fi
  done

  if [[ "${hits}" -ge 2 ]]; then
    echo "✅ ${label} (:${port}) — design system detectado (${hits}/${#MARKERS[@]} markers en CSS global)"
  else
    echo "❌ ${label} (:${port}) — CSS antiguo (${hits}/${#MARKERS[@]} markers). Reinicia el servidor."
    FAIL=1
  fi

  if [[ "${port}" == "${DEV_PORT}" ]] && curl -sf "http://localhost:${port}/" | grep -q '@vite/client'; then
    echo "   ↳ Dev server Vite activo — usa http://localhost:${port} para ver cambios al instante"
  fi
}

echo "CloudOps — verificación UI (Fase 24 borderless)"
echo "Commit: $(git -C "${ROOT}" rev-parse --short HEAD 2>/dev/null || echo 'n/a')"
echo ""

check_port "${DEV_PORT}" "Dev frontend" || true
check_port "${DOCKER_PORT}" "Docker frontend" || true

echo ""
if [[ "${FAIL}" -eq 0 ]]; then
  echo "OK — Abre http://localhost:${DEV_PORT} y fuerza recarga (Ctrl+Shift+R)"
  echo "   Desarrollo: npm run dev:frontend"
  echo "   Docker:     docker compose -f infra/docker-compose.yml build frontend && docker compose -f infra/docker-compose.yml up -d frontend"
  exit 0
fi

echo "FALLÓ — Ejecuta: npm run dev:frontend"
echo "Si usas Docker (:${DOCKER_PORT}), rebuild del contenedor frontend."
exit 1
