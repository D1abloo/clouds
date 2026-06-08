#!/usr/bin/env bash
# Prepara fullchain.pem + private.key para nginx desde certificado/
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/certificado"
OUT="${ROOT}/infra/certs"

mkdir -p "${OUT}"

if [ ! -f "${SRC}/spendlyx.com_ssl_certificate.cer" ]; then
  echo "Falta ${SRC}/spendlyx.com_ssl_certificate.cer"
  exit 1
fi
if [ ! -f "${SRC}/_.spendlyx.com_private_key.key" ]; then
  echo "Falta ${SRC}/_.spendlyx.com_private_key.key"
  exit 1
fi

cat "${SRC}/spendlyx.com_ssl_certificate.cer" \
  "${SRC}/intermediate1.cer" \
  "${SRC}/intermediate2.cer" > "${OUT}/fullchain.pem"
cp "${SRC}/_.spendlyx.com_private_key.key" "${OUT}/private.key"
chmod 600 "${OUT}/private.key"
chmod 644 "${OUT}/fullchain.pem"

echo "==> Certificados listos en ${OUT}/"
openssl x509 -in "${OUT}/fullchain.pem" -noout -subject -dates 2>/dev/null || true
