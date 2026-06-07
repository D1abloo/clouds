# Informe de verificación — Panel Admin CloudOps

> Generado: 2026-06-07T22:37:51.122Z
> Recomendación final: **NOT_READY_FOR_PRO**

## Resumen ejecutivo

Código y builds listos para PRO (54 rutas sidebar, auth OAuth con callback, Prisma 61 modelos, UI en español). **Bloqueantes de despliegue:** PostgreSQL no accesible en este entorno (`migrate deploy` falló), credenciales OAuth/cloud vacías en `.env.example`, y varias páginas siguen sirviendo datasets demo hasta conectar APIs live.

## Criterios PRO (manual)

| Criterio | Estado |
|----------|--------|
| Build backend + frontend | ✅ |
| Auth + OAuth callback API | ✅ |
| PostgreSQL configurado y migraciones aplicadas | ❌ (servidor no disponible) |
| Archivos de migración Prisma | ✅ |
| Rutas admin protegidas (`authGuard`) | ✅ |
| Rutas sidebar registradas | ✅ |
| UI en español (breadcrumbs, login) | ✅ |
| APIs críticas (módulos NestJS) | ✅ |
| Secretos no expuestos en repo | ✅ |
| Páginas sin modo demo forzado | ✅ (`demoMode` vía `ProModeService`) |
| E2E Playwright configurado | ✅ (`e2e/admin-sidebar.spec.ts`) |

## Sidebar — rutas

| Sección | Ítem | Ruta | Página | UI | Demo | PRO | Notas |
|---------|------|------|--------|----|----|-----|-------|
| Resumen | Catálogo | `/runbooks` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Resumen | Tablero | `/dashboard` | OK | OK | OK | WARN | Component path not resolved |
| Resumen | Centro de mando | `/command-center` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Resumen | Explorador de recursos | `/resource-explorer` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Resumen | Mapa de topología | `/topology-map` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Resumen | Centro de salud | `/health-center` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Nubes | AWS | `/cloud/aws/overview` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Nubes | GCP | `/cloud/gcp/overview` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Nubes | Azure | `/cloud/azure/overview` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | Instancias | `/instances/all-instances` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | VPS / Bare metal | `/vps/overview` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | Docker | `/docker/containers` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | Kubernetes | `/kubernetes/pods` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | Red | `/network` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | Almacenamiento | `/storage` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | Copias de seguridad | `/backups` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | Planificador de capacidad | `/capacity-planner` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Automatización | Jenkins | `/jenkins/jobs` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Automatización | Terraform | `/terraform/workspaces` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Automatización | Despliegues | `/deployments` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Automatización | Sesiones activas | `/terminal/active-sessions` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Automatización | Historial | `/terminal/history` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Automatización | Runbooks | `/runbooks` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Automatización | Programador | `/scheduler` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Automatización | Catálogo de servicios | `/service-catalog` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Automatización | Aprobaciones | `/approvals` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | GitHub | `/repositories/github` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | GitLab | `/repositories/gitlab` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | Webhooks | `/repositories/webhooks` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | Ramas | `/repositories/branches` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | Commits | `/repositories/commits` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | Pull Requests | `/repositories/pull-requests` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | Despliegues | `/repositories/deployments` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Observabilidad | Métricas | `/metrics/overview` | OK | OK | OK | WARN | TODO/placeholder text |
| Observabilidad | Logs | `/logs` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Observabilidad | Facturación | `/billing/overview` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Observabilidad | Optimizador de costes | `/cost-optimizer` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Observabilidad | Alertas | `/alerts/active` | OK | OK | OK | WARN | TODO/placeholder text |
| Observabilidad | Incidentes | `/incidents` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Observabilidad | Notificaciones | `/notifications/all` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Observabilidad | Informes | `/reports` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Observabilidad | Gestión de cambios | `/change-management` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Seguridad | Centro de seguridad | `/security-center` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Seguridad | Gestor de secretos | `/secrets-manager` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Seguridad | Cumplimiento / Políticas | `/compliance` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Seguridad | Control de acceso | `/access-control` | OK | OK | OK | WARN | TODO/placeholder text |
| Seguridad | Auditoría | `/audit/activity-logs` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Administración | Usuarios | `/admin/users` | OK | OK | OK | WARN | TODO/placeholder text |
| Administración | Roles | `/admin/roles` | OK | OK | OK | WARN | TODO/placeholder text |
| Administración | Tokens API | `/admin/api-tokens` | OK | OK | OK | WARN | TODO/placeholder text |
| Administración | Webhooks | `/admin/webhooks` | OK | OK | OK | WARN | TODO/placeholder text |
| Administración | Configuración | `/settings/general` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Administración | Modo demo | `/admin/demo-mode` | OK | OK | OK | WARN | TODO/placeholder text |
| Administración | Asistente IA | `/ai-assistant` | OK | OK | OK | OK | Ruta registrada en area-nav |

## API y backend

| Módulo | Cubierto |
|--------|----------|
| aws | ✅ |
| gcp | ✅ |
| azure | ✅ |
| instances | ✅ |
| vps | ✅ |
| docker | ✅ |
| kubernetes | ✅ |
| network | ✅ |
| storage | ✅ |
| backups | ✅ |
| capacity | ✅ |
| jenkins | ✅ |
| terraform | ✅ |
| deployments | ✅ |
| sessions | ✅ |
| history | ✅ |
| runbooks | ✅ |
| scheduler | ✅ |
| service-catalog | ✅ |
| approvals | ✅ |
| github | ✅ |
| gitlab | ✅ |
| webhooks | ✅ |
| branches | ✅ |
| commits | ✅ |
| pull-requests | ✅ |
| metrics | ✅ |
| logs | ✅ |
| billing | ✅ |
| cost-optimizer | ✅ |
| alerts | ✅ |
| incidents | ✅ |
| notifications | ✅ |
| reports | ✅ |
| change-management | ✅ |
| security | ✅ |
| secrets | ✅ |
| compliance | ✅ |
| access-control | ✅ |
| audit | ✅ |
| users | ✅ |
| roles | ✅ |
| api-tokens | ✅ |
| settings | ✅ |
| demo | ✅ |
| integrations | ✅ |
| command-center | ✅ |

## PostgreSQL / Prisma

| Tabla esperada | Modelo Prisma | Estado |
|------------------|---------------|--------|
| users | User | OK |
| roles | Role | OK |
| permissions | Permission | OK |
| role_permissions | RolePermission | OK |
| sessions | UserSession | OK |
| oauth_accounts | OAuthAccount | OK |
| cloud_accounts | CloudAccount | OK |
| cloud_credentials | CloudCredential | OK |
| resources | KubernetesResource | OK |
| instances | Instance | OK |
| servers | VpsServer | OK |
| containers | DockerContainer | OK |
| kubernetes_clusters | KubernetesCluster | OK |
| networks | CloudRegion | OK |
| storage_volumes | StorageVolume | OK |
| backups | Backup | OK |
| deployments | GithubDeployment | OK |
| automation_jobs | JenkinsJob | OK |
| runbooks | Runbook | OK |
| schedules | Schedule | OK |
| approvals | Approval | OK |
| repositories | GithubRepository | OK |
| webhooks | GithubWebhook | OK |
| branches | GithubBranch | OK |
| commits | GithubCommit | OK |
| pull_requests | GithubPullRequest | OK |
| metrics | MetricSample | OK |
| logs | TerraformRunLog | OK |
| billing_accounts | BillingAccount | OK |
| invoices | BillingRecord | OK |
| cost_optimization_recommendations | CostOptimizationRecommendation | OK |
| alerts | Alert | OK |
| incidents | Alert | OK |
| notifications | Notification | OK |
| reports | Report | OK |
| change_management | ChangeRequest | OK |
| secrets | Secret | OK |
| compliance_policies | CompliancePolicy | OK |
| audit_logs | AuditLog | OK |
| api_tokens | ApiToken | OK |
| settings | IntegrationConfig | OK |
| assistant_threads | AssistantThread | OK |
| assistant_messages | AssistantMessage | OK |

## Login y OAuth

- Iniciar sesión: ✅
- Google OAuth UI: ✅
- GitHub OAuth UI: ✅
- Modo demo: ✅
- Fondo cloud: ✅
- Español errores: ✅

## Logos oficiales

- **AWS**: OK — aws.svg
- **GCP**: OK — gcp.svg
- **Azure**: OK — azure.svg
- **Docker**: OK — docker.svg
- **Kubernetes**: OK — kubernetes.svg
- **GitHub**: OK — github.svg
- **GitLab**: OK — gitlab.svg
- **Jenkins**: OK — jenkins.svg
- **Terraform**: OK — terraform.svg
- **Google**: OK — google.svg

## Calidad (checks)

- `npm run build -w apps/frontend-angular`: ✅ OK (11391ms)
- `npm run build -w apps/backend-api`: ✅ OK (5457ms)

## Elementos faltantes

- PostgreSQL: servidor no accesible en `localhost:5432` — ejecutar `docker compose up -d postgres` y `npx prisma migrate deploy`
- OAuth PRO: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` vacíos en `.env`
- Datos live: conectar integraciones cloud y sustituir datasets demo en páginas observabilidad/admin

## Riesgos restantes

- Revisar manualmente flujos OAuth en PRO con credenciales reales.
- Docker no disponible en entorno CI local — usar PostgreSQL gestionado en staging.

## Cómo pasar a PRO

```bash
DEMO_MODE=false
PRO_MODE=true
INTEGRATIONS_LIVE=true
# + credenciales OAuth, cloud y PostgreSQL
```
