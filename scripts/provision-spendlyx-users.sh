#!/usr/bin/env bash
# Crea usuarios del panel Spendlyx en el VPS vía SSH + contenedor backend.
#
# Ejemplos:
#   ./scripts/provision-spendlyx-users.sh admin
#   ./scripts/provision-spendlyx-users.sh admin --email admin@spendlyx.com
#   ./scripts/provision-spendlyx-users.sh presets
#   ./scripts/provision-spendlyx-users.sh create --email ops@empresa.com --name "Operador" --role operador
#   ./scripts/provision-spendlyx-users.sh list
#   ./scripts/provision-spendlyx-users.sh local admin
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-root@82.223.54.195}"
SCRIPT_SRC="${ROOT}/apps/backend-api/scripts/provision-panel-users.js"
CONTAINER="${SPENDLYX_BACKEND_CONTAINER:-cloudops-backend}"
REMOTE_SCRIPT="/app/scripts/provision-panel-users.js"

usage() {
  cat <<'EOF'
Uso: provision-spendlyx-users.sh [local] <comando> [opciones]

Comandos:
  admin     Superadministrador con acceso total (pass 10 dígitos auto si no se indica)
  presets   Usuarios de ejemplo por rol (admin, administrador, operador, auditor, solo_lectura)
  create    Usuario concreto: --email, --name, --role [, --password]
  list      Lista usuarios en la BD

Opciones:
  --email, --name, --role, --password, --membership

Variables:
  REMOTE_HOST (default: root@82.223.54.195)
  SPENDLYX_BACKEND_CONTAINER (default: cloudops-backend)
EOF
}

if [ ! -f "${SCRIPT_SRC}" ]; then
  echo "No se encontró ${SCRIPT_SRC}" >&2
  exit 1
fi

TARGET="remote"
if [ "${1:-}" = "local" ]; then
  TARGET="local"
  shift
fi

CMD="${1:-admin}"
shift || true

if [ "${CMD}" = "-h" ] || [ "${CMD}" = "--help" ]; then
  usage
  exit 0
fi

NODE_ARGS=()
case "${CMD}" in
  admin)
    NODE_ARGS=(--admin "$@")
    ;;
  presets)
    NODE_ARGS=(--presets "$@")
    ;;
  list)
    NODE_ARGS=(--list)
    ;;
  create)
    email=""
    name=""
    role=""
    password=""
    membership=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --email) email="$2"; shift 2 ;;
        --name) name="$2"; shift 2 ;;
        --role) role="$2"; shift 2 ;;
        --password) password="$2"; shift 2 ;;
        --membership) membership="$2"; shift 2 ;;
        *)
          echo "Opción desconocida: $1" >&2
          exit 1
          ;;
      esac
    done
    if [ -z "${email}" ] || [ -z "${role}" ]; then
      echo "create requiere --email y --role" >&2
      exit 1
    fi
    NODE_ARGS=(--user "${email}")
    [ -n "${name}" ] && NODE_ARGS+=(--name "${name}")
    NODE_ARGS+=(--role "${role}")
    [ -n "${password}" ] && NODE_ARGS+=(--password "${password}")
    [ -n "${membership}" ] && NODE_ARGS+=(--membership "${membership}")
    ;;
  *)
    echo "Comando desconocido: ${CMD}" >&2
    usage
    exit 1
    ;;
esac

run_local() {
  docker cp "${SCRIPT_SRC}" "${CONTAINER}:${REMOTE_SCRIPT}"
  docker exec "${CONTAINER}" node "${REMOTE_SCRIPT}" "${NODE_ARGS[@]}"
}

run_remote() {
  echo "==> VPS: ${REMOTE_HOST} | contenedor: ${CONTAINER}"
  rsync -az "${SCRIPT_SRC}" "${REMOTE_HOST}:/tmp/provision-panel-users.js"
  ssh -o StrictHostKeyChecking=accept-new "${REMOTE_HOST}" \
    "docker cp /tmp/provision-panel-users.js ${CONTAINER}:${REMOTE_SCRIPT} && docker exec ${CONTAINER} node ${REMOTE_SCRIPT} $(printf '%q ' "${NODE_ARGS[@]}")"
}

echo "==> ${CMD} (${TARGET})"
if [ "${TARGET}" = "local" ]; then
  run_local
else
  run_remote
fi
