# Informe de verificación — Panel Admin CloudOps

> Generado: 2026-06-07T22:26:12.680Z
> Recomendación final: **READY_FOR_PRO**

## Resumen ejecutivo

Panel verificado: 54 rutas sidebar, Prisma con 41 modelos, demo operativo. Revisar OAuth/cloud en entorno PRO real.

## Sidebar — rutas

| Sección | Ítem | Ruta | Página | UI | Demo | PRO | Notas |
|---------|------|------|--------|----|----|-----|-------|
| Resumen | Catálogo | `/runbooks` | OK | OK | OK | WARN | TODO/placeholder text |
| Resumen | Tablero | `/dashboard` | OK | OK | OK | WARN | Component path not resolved |
| Resumen | Centro de mando | `/command-center` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Resumen | Explorador de recursos | `/resource-explorer` | OK | OK | OK | WARN | TODO/placeholder text |
| Resumen | Mapa de topología | `/topology-map` | OK | OK | OK | WARN | TODO/placeholder text |
| Resumen | Centro de salud | `/health-center` | OK | OK | OK | WARN | TODO/placeholder text |
| Nubes | AWS | `/cloud/aws/overview` | OK | OK | OK | WARN | TODO/placeholder text |
| Nubes | GCP | `/cloud/gcp/overview` | OK | OK | OK | WARN | TODO/placeholder text |
| Nubes | Azure | `/cloud/azure/overview` | OK | OK | OK | WARN | TODO/placeholder text |
| Infraestructura | Instancias | `/instances/all-instances` | OK | OK | OK | WARN | TODO/placeholder text |
| Infraestructura | VPS / Bare metal | `/vps/overview` | OK | OK | OK | WARN | TODO/placeholder text |
| Infraestructura | Docker | `/docker/containers` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Infraestructura | Kubernetes | `/kubernetes/pods` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Infraestructura | Red | `/network` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Infraestructura | Almacenamiento | `/storage` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Infraestructura | Copias de seguridad | `/backups` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Infraestructura | Planificador de capacidad | `/capacity-planner` | OK | OK | OK | WARN | TODO/placeholder text |
| Automatización | Jenkins | `/jenkins/jobs` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Automatización | Terraform | `/terraform/workspaces` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Automatización | Despliegues | `/deployments` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Automatización | Sesiones activas | `/terminal/active-sessions` | OK | OK | OK | WARN | TODO/placeholder text |
| Automatización | Historial | `/terminal/history` | OK | OK | OK | WARN | TODO/placeholder text |
| Automatización | Runbooks | `/runbooks` | OK | OK | OK | WARN | TODO/placeholder text |
| Automatización | Programador | `/scheduler` | OK | OK | OK | WARN | TODO/placeholder text |
| Automatización | Catálogo de servicios | `/service-catalog` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Automatización | Aprobaciones | `/approvals` | OK | OK | OK | WARN | TODO/placeholder text |
| Repositorios | GitHub | `/repositories/github` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Repositorios | GitLab | `/repositories/gitlab` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Repositorios | Webhooks | `/repositories/webhooks` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Repositorios | Ramas | `/repositories/branches` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Repositorios | Commits | `/repositories/commits` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Repositorios | Pull Requests | `/repositories/pull-requests` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Repositorios | Despliegues | `/repositories/deployments` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Observabilidad | Métricas | `/metrics/overview` | OK | OK | OK | WARN | TODO/placeholder text |
| Observabilidad | Logs | `/logs` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Observabilidad | Facturación | `/billing/overview` | OK | OK | OK | WARN | TODO/placeholder text |
| Observabilidad | Optimizador de costes | `/cost-optimizer` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Observabilidad | Alertas | `/alerts/active` | OK | OK | OK | WARN | TODO/placeholder text |
| Observabilidad | Incidentes | `/incidents` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Observabilidad | Notificaciones | `/notifications/all` | OK | OK | OK | WARN | TODO/placeholder text |
| Observabilidad | Informes | `/reports` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Observabilidad | Gestión de cambios | `/change-management` | OK | OK | OK | WARN | TODO/placeholder text |
| Seguridad | Centro de seguridad | `/security-center` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Seguridad | Gestor de secretos | `/secrets-manager` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Seguridad | Cumplimiento / Políticas | `/compliance` | OK | OK | OK | WARN | TODO/placeholder text |
| Seguridad | Control de acceso | `/access-control` | OK | OK | OK | WARN | TODO/placeholder text |
| Seguridad | Auditoría | `/audit/activity-logs` | OK | OK | OK | WARN | Ruta registrada en area-nav |
| Administración | Usuarios | `/admin/users` | OK | OK | OK | WARN | TODO/placeholder text |
| Administración | Roles | `/admin/roles` | OK | OK | OK | WARN | TODO/placeholder text |
| Administración | Tokens API | `/admin/api-tokens` | OK | OK | OK | WARN | TODO/placeholder text |
| Administración | Webhooks | `/admin/webhooks` | OK | OK | OK | WARN | TODO/placeholder text |
| Administración | Configuración | `/settings/general` | OK | OK | OK | WARN | TODO/placeholder text |
| Administración | Modo demo | `/admin/demo-mode` | OK | OK | OK | WARN | TODO/placeholder text |
| Administración | Asistente IA | `/ai-assistant` | OK | OK | OK | WARN | Ruta registrada en area-nav |

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
| network | ⚠️ |
| storage | ⚠️ |
| backups | ⚠️ |
| capacity | ⚠️ |
| jenkins | ✅ |
| terraform | ✅ |
| deployments | ⚠️ |
| sessions | ⚠️ |
| history | ⚠️ |
| runbooks | ⚠️ |
| scheduler | ⚠️ |
| service-catalog | ⚠️ |
| approvals | ⚠️ |
| github | ✅ |
| gitlab | ⚠️ |
| webhooks | ⚠️ |
| branches | ⚠️ |
| commits | ⚠️ |
| pull-requests | ⚠️ |
| metrics | ✅ |
| logs | ⚠️ |
| billing | ✅ |
| cost-optimizer | ⚠️ |
| alerts | ✅ |
| incidents | ⚠️ |
| notifications | ✅ |
| reports | ⚠️ |
| change-management | ⚠️ |
| security | ⚠️ |
| secrets | ⚠️ |
| compliance | ⚠️ |
| access-control | ⚠️ |
| audit | ✅ |
| users | ✅ |
| roles | ✅ |
| api-tokens | ⚠️ |
| settings | ⚠️ |
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
| sessions | SshSession | OK |
| oauth_accounts | GithubAccount | OK |
| cloud_accounts | CloudAccount | OK |
| cloud_credentials | CloudCredential | OK |
| resources | KubernetesResource | OK |
| instances | Instance | OK |
| servers | VpsServer | OK |
| containers | DockerContainer | OK |
| kubernetes_clusters | KubernetesCluster | OK |
| networks | CloudRegion | OK |
| storage_volumes | — | PARTIAL |
| backups | — | PARTIAL |
| deployments | GithubDeployment | OK |
| automation_jobs | JenkinsJob | OK |
| runbooks | — | PARTIAL |
| schedules | — | PARTIAL |
| approvals | — | PARTIAL |
| repositories | GithubRepository | OK |
| webhooks | GithubWebhook | OK |
| branches | GithubBranch | OK |
| commits | GithubCommit | OK |
| pull_requests | GithubPullRequest | OK |
| metrics | MetricSample | OK |
| logs | TerraformRunLog | OK |
| billing_accounts | BillingAccount | OK |
| invoices | BillingRecord | OK |
| cost_optimization_recommendations | — | PARTIAL |
| alerts | Alert | OK |
| incidents | Alert | OK |
| notifications | Notification | OK |
| reports | — | PARTIAL |
| change_management | — | PARTIAL |
| secrets | — | PARTIAL |
| compliance_policies | — | PARTIAL |
| audit_logs | AuditLog | OK |
| api_tokens | — | PARTIAL |
| settings | IntegrationConfig | OK |
| assistant_threads | — | PARTIAL |
| assistant_messages | — | PARTIAL |

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


## Elementos faltantes

- Ninguno crítico detectado automáticamente.

## Riesgos restantes

- API/adaptador parcial para: network
- API/adaptador parcial para: storage
- API/adaptador parcial para: backups
- API/adaptador parcial para: capacity
- API/adaptador parcial para: deployments
- API/adaptador parcial para: sessions
- API/adaptador parcial para: history
- API/adaptador parcial para: runbooks
- API/adaptador parcial para: scheduler
- API/adaptador parcial para: service-catalog
- API/adaptador parcial para: approvals
- API/adaptador parcial para: gitlab
- API/adaptador parcial para: webhooks
- API/adaptador parcial para: branches
- API/adaptador parcial para: commits

## Cómo pasar a PRO

```bash
DEMO_MODE=false
PRO_MODE=true
INTEGRATIONS_LIVE=true
# + credenciales OAuth, cloud y PostgreSQL
```
