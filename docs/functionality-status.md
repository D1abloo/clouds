# Functionality Status — CloudOps Control Center

Estado tras **Fase 29 (pulido final)**. Todas las opciones del sidebar tienen ruta y pantalla con datos demo.

## Leyenda

| Estado | Significado |
|--------|-------------|
| ✅ Demo | Pantalla completa con datos demo y acciones simuladas |
| ✅ Live | Conectado a API cuando backend está activo |
| ↩️ Fallback | API opcional; cae a demo automáticamente |

## Sidebar — Overview

| Módulo | Ruta | Estado |
|--------|------|--------|
| Dashboard | `/dashboard` | ✅ Live + ↩️ fallback demo |
| Command Center | `/command-center` | ✅ Demo |
| Resource Explorer | `/resource-explorer` | ✅ Demo |
| Topology Map | `/topology-map` | ✅ Demo |
| Health Center | `/health-center` | ✅ Demo |

## Sidebar — Clouds

| Módulo | Ruta | Estado |
|--------|------|--------|
| AWS (6 sub-rutas) | `/cloud/aws/*` | ✅ Live hub + ↩️ demo |
| GCP | `/cloud/gcp/*` | ✅ Live hub + ↩️ demo |
| Azure | `/cloud/azure/*` | ✅ Live hub + ↩️ demo |

## Sidebar — Infrastructure

| Módulo | Ruta | Estado |
|--------|------|--------|
| Instances | `/instances/all-instances` | ✅ Live + ↩️ demo |
| VPS | `/vps/overview` | ✅ Live + ↩️ demo |
| Docker | `/docker/containers` | ✅ Live + ↩️ demo |
| Kubernetes | `/kubernetes/pods` | ✅ Live + ↩️ demo |
| Network | `/network` | ✅ Demo |
| Storage | `/storage` | ✅ Demo |
| Backups | `/backups` | ✅ Demo |
| Capacity Planner | `/capacity-planner` | ✅ Demo |

## Sidebar — Automation

| Módulo | Ruta | Estado |
|--------|------|--------|
| Jenkins | `/jenkins/jobs` | ✅ Live + ↩️ demo |
| Terraform | `/terraform/workspaces` | ✅ Live + ↩️ demo |
| Deployments | `/deployments` | ✅ Demo |
| Terminal | `/terminal/active-sessions` | ✅ Live VPS list + ↩️ demo |
| Runbooks | `/runbooks` | ✅ Demo |
| Scheduler | `/scheduler` | ✅ Demo |
| Service Catalog | `/service-catalog` | ✅ Demo |
| Approvals | `/approvals` | ✅ Demo |

## Sidebar — Observability

| Módulo | Ruta | Estado |
|--------|------|--------|
| Metrics | `/metrics/overview` | ✅ Demo |
| Logs | `/logs` | ✅ Demo |
| Billing | `/billing/overview` | ✅ Live + ↩️ demo |
| Cost Optimizer | `/cost-optimizer` | ✅ Demo |
| Alerts | `/alerts/active` | ✅ Live + ↩️ demo |
| Incidents | `/incidents` | ✅ Demo |
| Notifications | `/notifications/all` | ✅ Live + ↩️ demo |
| Reports | `/reports` | ✅ Demo |
| Change Management | `/change-management` | ✅ Demo |

## Sidebar — Security & Admin

| Módulo | Ruta | Estado |
|--------|------|--------|
| Security Center | `/security-center` | ✅ Demo |
| Secrets Manager | `/secrets-manager` | ✅ Demo |
| Compliance | `/compliance` | ✅ Demo |
| Access Control | `/access-control` | ✅ Demo |
| Audit | `/audit/activity-logs` | ✅ Live + ↩️ demo |
| Users | `/admin/users` | ✅ Demo |
| Roles | `/admin/roles` | ✅ Demo (section-hub) |
| API Tokens | `/admin/api-tokens` | ✅ Demo |
| Webhooks | `/admin/webhooks` | ↩️ Redirect → API Tokens |
| Settings | `/settings/general` | ✅ Demo |
| Demo Mode | `/admin/demo-mode` | ✅ Live API |
| AI Assistant | `/ai-assistant` | ✅ Demo |

## Botones globales

| Acción | Comportamiento |
|--------|----------------|
| Refresh / Sync | Recarga datos; fallback demo si API falla |
| Add account / Launch / Validate | Modal + toast demo |
| Start / Stop / Restart | Acción simulada + audit demo |
| Export / Generate plan / Apply | Toast + audit demo |
| Load demo / Reset demo | `/admin/demo-mode` |

## Loaders

- `createPageLoader`: timeout 20s + `finalize()` siempre cierra loading
- Servicios HTTP: `catchError` → datos demo
- Platform modules: carga simulada ≤5s, nunca infinita

## Pendientes menores

- Webhooks: panel dedicado (hoy redirige a API Tokens)
- Roles: usa section-hub genérico (funcional con demo)
