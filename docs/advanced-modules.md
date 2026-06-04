# Advanced modules — CloudOps Control Center (Fase 28)

Módulos avanzados para completar la plataforma cloud/devops profesional.

## Módulos custom (UI dedicada)

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Resource Explorer** | `/resource-explorer` | Búsqueda global con filtros por tipo, proveedor y estado. Resultados agrupados, acciones rápidas y detalle. |
| **Topology Map** | `/topology-map` | Grafo SVG de infraestructura — clouds, cuentas, regiones, redes, instancias, VPS, Docker, K8s. Zoom, filtros y click en nodos. |
| **AI Assistant** | `/ai-assistant` | Copilot demo con preguntas sugeridas y respuestas basadas en datos demo del sistema. |

## Módulos platform (PlatformModulePage)

| Módulo | Ruta | Capacidades |
|--------|------|-------------|
| **Runbooks** | `/runbooks` | 8 runbooks demo, ejecución, logs, asociación a instancias/alertas |
| **Scheduler** | `/scheduler` | Tareas programadas (cron), historial, calendario demo |
| **Health Center** | `/health-center` | Salud global, recursos afectados, gráficos donut/line |
| **Compliance / Policies** | `/compliance` | Violaciones, reglas, severidad, remediación demo |
| **Capacity Planner** | `/capacity-planner` | CPU/RAM/disco, resize, forecast, ahorro |
| **Change Management** | `/change-management` | Cambios recientes (audit, Terraform, Jenkins, SSH) |
| **API Tokens & Webhooks** | `/admin/api-tokens` | Tokens, webhooks, eventos, logs de entrega |

## Sidebar Fase 28

### Overview
Dashboard · Command Center · **Resource Explorer** · **Topology Map** · **Health Center**

### Infrastructure
Instances · VPS · Docker · Kubernetes · Network · Storage · Backups · **Capacity Planner**

### Automation
Jenkins · Terraform · Deployments · Terminal · **Runbooks** · **Scheduler** · Service Catalog · Approvals

### Observability
Metrics · Logs · Billing · Cost Optimizer · Alerts · Incidents · Notifications · Reports · **Change Management**

### Security
Security Center · Secrets Manager · **Compliance / Policies** · Access Control · Audit

### Admin
Users · Roles · **API Tokens** · **Webhooks** · Settings · Demo Mode · **AI Assistant**

## Eventos webhook (demo)

- `instance.created`
- `instance.status.changed`
- `alert.created`
- `terraform.apply.finished`
- `jenkins.build.failed`
- `billing.updated`

## Runbooks demo

1. Restart Nginx
2. Clean disk
3. Restart Docker
4. Check Kubernetes pods
5. Backup PostgreSQL
6. Diagnose SSH
7. Check open ports
8. High CPU investigation

## Preguntas Copilot (demo)

- ¿Qué instancia consume más?
- ¿Qué recursos están fallando?
- ¿Dónde puedo ahorrar coste?
- Resume el estado de Kubernetes.
- Genera diagnóstico de esta VPS.
- Qué alertas críticas hay ahora.
- Qué acciones pendientes de aprobación existen.

## Archivos clave

```
features/advanced/
  resource-explorer.component.ts
  topology-map.component.ts
  ai-assistant.component.ts
shared/platform/
  advanced-modules.demo.ts
  platform-modules.demo.ts  (RUNBOOKS, SCHEDULER, HEALTH, etc.)
layout/sidebar/sidebar-tree.config.ts
core/routing/navigation.routes.ts
```

## Verificación

```bash
npm run dev:frontend
# http://localhost:4200
# Login: admin@cloudops.local / Admin123!
```

Tras cambios: **Ctrl+Shift+R**
