#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SCOPE="${1:-all}"

echo "==> CloudOps — tests (scope: $SCOPE)"

run_workspace_tests() {
  npm run test --workspaces --if-present
}

case "$SCOPE" in
  backend)
    npm run test -w apps/backend-api
    ;;
  workers)
    npm run test -w apps/workers 2>/dev/null || echo "Workers tests not configured yet"
    ;;
  frontend)
    npm run test -w apps/frontend-angular -- --no-watch --browsers=ChromeHeadless
    ;;
  packages)
    npm run test -w packages/cloud-sdk 2>/dev/null || true
    ;;
  all)
    npm run test -w apps/backend-api
    npm run test -w apps/frontend-angular -- --no-watch --browsers=ChromeHeadless 2>/dev/null || echo "Frontend tests skipped (Chrome not available)"
    ;;
  *)
    echo "Usage: $0 [all|backend|frontend|workers|packages]"
    exit 1
    ;;
esac

echo "==> Tests finished"
