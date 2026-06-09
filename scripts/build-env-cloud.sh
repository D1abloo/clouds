#!/usr/bin/env bash
# Genera infra/.env.cloud desde credenciales locales (sin imprimir secretos).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/infra/.env.cloud"
AWS_CSV="${AWS_CSV:-${HOME}/Descargas/prueba_accessKeys.csv}"
GCP_JSON="${GCP_JSON:-${HOME}/Descargas/project-8c8648d2-e16c-40c5-a70-0359151a18a4.json}"

python3 - "${AWS_CSV}" "${GCP_JSON}" "${OUT}" <<'PY'
import base64, csv, json, pathlib, sys

aws_csv, gcp_json, out = map(pathlib.Path, sys.argv[1:4])
lines: list[str] = []

if aws_csv.exists():
    with aws_csv.open() as f:
        rows = list(csv.reader(f))
    if len(rows) >= 2:
        key, secret = rows[1][0].strip(), rows[1][1].strip()
        lines += [
            f"AWS_ACCESS_KEY_ID={key}",
            f"AWS_SECRET_ACCESS_KEY={secret}",
            "AWS_DEFAULT_REGION=eu-west-1",
            "AWS_ACCOUNT_ID=",
        ]

if gcp_json.exists():
    data = json.loads(gcp_json.read_text())
    b64 = base64.b64encode(json.dumps(data, separators=(',', ':')).encode()).decode()
    lines += [
        f"GCP_PROJECT_ID={data.get('project_id', '')}",
        f"GCP_SERVICE_ACCOUNT_JSON_B64={b64}",
    ]

if not lines:
    raise SystemExit("No se encontraron credenciales AWS/GCP")

out.write_text("\n".join(lines) + "\n")
out.chmod(0o600)
print(f"OK {out} ({len(lines)} variables)")
PY
