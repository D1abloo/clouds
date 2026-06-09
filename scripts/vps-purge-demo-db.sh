#!/usr/bin/env bash
# Purga datos demo en PostgreSQL de la VPS (sin tocar usuarios PRO).
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@82.223.54.195}"

echo "==> Purga demo en PostgreSQL (${REMOTE_HOST})"

ssh "${REMOTE_HOST}" "docker exec -i cloudops-postgres psql -U cloudops -d cloudops -v ON_ERROR_STOP=1" <<'SQL'
BEGIN;

DELETE FROM metric_samples WHERE resource_id LIKE 'demo-inst-%';
DELETE FROM instances WHERE id LIKE 'demo-inst-%' OR external_id ILIKE '%demo%';
DELETE FROM cloud_credentials WHERE cloud_account_id LIKE 'demo-%';
DELETE FROM cloud_regions WHERE cloud_account_id LIKE 'demo-%';
DELETE FROM cloud_accounts WHERE id LIKE 'demo-%';
DELETE FROM vps_servers WHERE id LIKE 'demo-vps%';
DELETE FROM alerts WHERE id LIKE 'demo-alert%';
DELETE FROM notifications WHERE title ILIKE '%demo%';
DELETE FROM billing_records WHERE billing_account_id LIKE 'demo-billing%';
DELETE FROM billing_accounts WHERE id LIKE 'demo-billing%';
DELETE FROM github_deployments WHERE id LIKE 'gh-dep-%';
DELETE FROM github_webhooks WHERE id LIKE 'gh-wh-%';
DELETE FROM github_pull_requests;
DELETE FROM github_commits;
DELETE FROM github_branches;
DELETE FROM github_repositories WHERE id LIKE 'gh-repo-%';
DELETE FROM github_accounts WHERE id LIKE 'demo-github%';
DELETE FROM jenkins_builds WHERE id LIKE 'demo-%';
DELETE FROM jenkins_jobs WHERE id LIKE 'demo-%';
DELETE FROM jenkins_servers WHERE id LIKE 'demo-%';
DELETE FROM terraform_run_logs WHERE id LIKE 'demo-%';
DELETE FROM terraform_runs WHERE id LIKE 'demo-%';
DELETE FROM terraform_workspaces WHERE id LIKE 'demo-%';

COMMIT;

SELECT 'instances' AS tbl, COUNT(*)::text AS n FROM instances
UNION ALL SELECT 'cloud_accounts', COUNT(*)::text FROM cloud_accounts
UNION ALL SELECT 'alerts', COUNT(*)::text FROM alerts;
SQL

echo "==> Purga completada"
