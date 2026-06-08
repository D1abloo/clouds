# Informe de verificación — Panel Admin CloudOps

> Generado: 2026-06-08T21:58:27.108Z
> Recomendación final: **READY_FOR_PRO**

## Resumen ejecutivo

Panel listo para PRO: 54 rutas sidebar, PostgreSQL con 65 modelos Prisma, auth JWT+OAuth, RBAC activo, UI en español con estado «Configuración requerida» cuando faltan credenciales externas.

## Criterios PRO

| Criterio | Estado |
|----------|--------|
| DEMO_MODE=false / PRO_MODE=true | ✅ |
| PostgreSQL + migraciones | ✅ |
| Auth JWT + OAuth callback | ✅ |
| Rutas protegidas (authGuard) | ✅ |
| RBAC (PermissionsGuard) | ✅ |
| UI Configuración requerida | ✅ |
| Builds + tests (si --with-build) | ✅ |

## Sidebar — rutas

| Sección | Ítem | Ruta | Página | UI | Demo | PRO | Notas |
|---------|------|------|--------|----|----|-----|-------|
| Resumen | Catálogo | `/runbooks` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Resumen | Tablero | `/dashboard` | OK | OK | OK | WARN | Component path not resolved |
| Resumen | Centro de mando | `/command-center` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Resumen | Explorador de recursos | `/resource-explorer` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Resumen | Mapa de topología | `/topology-map` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Resumen | Centro de salud | `/health-center` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Nubes | AWS | `/cloud/aws/overview` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Nubes | GCP | `/cloud/gcp/overview` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Nubes | Azure | `/cloud/azure/overview` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | Instancias | `/instances/all-instances` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | VPS / Bare metal | `/vps/overview` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | Docker | `/docker/containers` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | Kubernetes | `/kubernetes/pods` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Infraestructura | Red | `/network` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Infraestructura | Almacenamiento | `/storage` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Infraestructura | Copias de seguridad | `/backups` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Infraestructura | Planificador de capacidad | `/capacity-planner` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Automatización | Jenkins | `/jenkins/jobs` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Automatización | Terraform | `/terraform/workspaces` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Automatización | Despliegues | `/deployments` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Automatización | Sesiones activas | `/terminal/active-sessions` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Automatización | Historial | `/terminal/history` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Automatización | Runbooks | `/runbooks` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Automatización | Programador | `/scheduler` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Automatización | Catálogo de servicios | `/service-catalog` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Automatización | Aprobaciones | `/approvals` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Repositorios | GitHub | `/repositories/github` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | GitLab | `/repositories/gitlab` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | Webhooks | `/repositories/webhooks` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | Ramas | `/repositories/branches` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | Commits | `/repositories/commits` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | Pull Requests | `/repositories/pull-requests` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Repositorios | Despliegues | `/repositories/deployments` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Observabilidad | Métricas | `/metrics/overview` | OK | OK | OK | WARN | TODO/placeholder text |
| Observabilidad | Logs | `/logs` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Observabilidad | Facturación | `/billing/overview` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Observabilidad | Optimizador de costes | `/cost-optimizer` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Observabilidad | Alertas | `/alerts/active` | OK | OK | OK | WARN | TODO/placeholder text |
| Observabilidad | Incidentes | `/incidents` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Observabilidad | Notificaciones | `/notifications/all` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Observabilidad | Informes | `/reports` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Observabilidad | Gestión de cambios | `/change-management` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Seguridad | Centro de seguridad | `/security-center` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Seguridad | Gestor de secretos | `/secrets-manager` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Seguridad | Cumplimiento / Políticas | `/compliance` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Seguridad | Control de acceso | `/access-control` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Seguridad | Auditoría | `/audit/activity-logs` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Administración | Usuarios | `/admin/users` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Administración | Roles | `/admin/roles` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Administración | Tokens API | `/admin/api-tokens` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Administración | Webhooks | `/admin/webhooks` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Administración | Configuración | `/settings/general` | OK | OK | OK | OK | Ruta registrada en area-nav |
| Administración | Modo demo | `/admin/demo-mode` | OK | OK | OK | OK | Estado configuración requerida en PRO |
| Administración | Asistente IA | `/ai-assistant` | OK | OK | OK | OK | Estado configuración requerida en PRO |

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
| organizations | Organization | OK |
| memberships | Membership | OK |
| workspaces | Project | OK |
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
| integration_connections | IntegrationConfig | OK |
| integration_sync_jobs | — | PARTIAL |
| integration_sync_events | IntegrationDelivery | OK |
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

- `npm run build -w apps/frontend-angular`: ✅ OK (12812ms)
- `npm run build -w apps/backend-api`: ✅ OK (6028ms)
- `npm test -w apps/backend-api`: ✅ OK (6460ms)

## Elementos faltantes

- Ninguno crítico detectado automáticamente.

## Riesgos restantes

- Completar al menos un login real con GitHub en producción para validar creación de usuario OAuth (Google ya verificado en BD).

## Verificación OAuth producción — spendlyx.com (2026-06-08)

Verificación manual y automatizada del flujo OAuth en https://spendlyx.com.

| Check | Estado | Detalle |
|-------|--------|---------|
| Botón «Continuar con Google» | ✅ | Visible en `/login`, redirige a Google OAuth |
| Botón «Continuar con GitHub» | ✅ | Visible en `/login`, redirige a GitHub OAuth |
| Callback Google | ✅ | `https://spendlyx.com/api/v1/auth/oauth/callback/google` |
| Callback GitHub | ✅ | `https://spendlyx.com/api/v1/auth/oauth/callback/github` |
| Inicio OAuth API | ✅ | `GET /api/v1/auth/oauth/{google\|github}` → `redirectUrl` |
| `platform/status` OAuth flags | ✅ | `oauth.google: true`, `oauth.github: true` |
| Modo demo oculto | ✅ | Sin botón «Entrar en modo demo» en PRO |
| Rutas protegidas | ✅ | `/dashboard` → redirect `/login` sin JWT |
| Errores en español | ✅ | Login, OAuth cancelado, email no verificado |
| Secretos no expuestos | ✅ | API no devuelve `*_SECRET` ni passwords |
| PostgreSQL OAuth | ✅ | Tabla `oauth_accounts` (Google: 1 cuenta) |
| Auditoría sesión | ✅ | `audit_logs`: `oauth_login` (4), `login` (4) |
| Builds producción | ✅ | frontend + backend + tests backend |

Variables VPS verificadas (enmascaradas): `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`, `OAUTH_CALLBACK_URL`, `AUTH_URL`, `DEMO_MODE=false`, `PRO_MODE=true`. Secretos presentes con longitud válida, no impresos.

## Correcciones de UX del panel PRO

| Cambio | Detalle |
|--------|---------|
| Sidebar colapsado | Secciones cerradas por defecto; solo la ruta activa se expande |
| Preferencias sidebar | Estado manual en `localStorage` (`cloudops_sidebar_expanded_v2`) |
| Selector entorno | Eliminado Spendlyx / Production / Staging del sidebar |
| Badges sidebar | Solo contadores reales (alertas, notificaciones no leídas) vía API |
| Notificaciones | Campos `read_at` y `section`; endpoints `unread-summary`, `read-all`, `:id/read` |
| Header | Sin badge PRO ni indicador WebSocket en topbar |
| Integraciones | Empty state corto: «Sin cuentas conectadas» + «Añadir cuenta» / «Conectar cuenta» |
| Español | «Marcar como leído», «Marcar todas como leídas», «No tienes notificaciones nuevas» |

## Cómo pasar a PRO

```bash
DEMO_MODE=false
PRO_MODE=true
INTEGRATIONS_LIVE=true
# + credenciales OAuth, cloud y PostgreSQL
```
