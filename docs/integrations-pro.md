# Integraciones PRO — Slack, PagerDuty, Jira

CloudOps entrega notificaciones a integraciones externas cuando ocurren alertas, despliegues, backups u otras operaciones del panel.

## Modos de entrega

| Modo | Condición | Comportamiento |
|------|-----------|----------------|
| **Simulación** | `DEMO_MODE=true` y `INTEGRATIONS_LIVE=false` | Registra entregas en BD + notificación in-app. No HTTP externo. |
| **PRO / Live** | `DEMO_MODE=false` **o** `INTEGRATIONS_LIVE=true` | HTTP real a Slack, PagerDuty y Jira si hay credenciales. |

## Variables de entorno (PRO)

```bash
DEMO_MODE=false
INTEGRATIONS_LIVE=true

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_ROUTING_KEY=your-routing-key
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=bot@company.com
JIRA_API_TOKEN=your-api-token
```

También puedes guardar credenciales por integración en **Administración → Configuración → Integraciones → Configurar** (campos `webhook`, `routing_key`, `api_token`, etc.).

## Mapa de fuentes del panel (bus de eventos)

| Módulo | Eventos emitidos | Cuándo |
|--------|------------------|--------|
| **Alertas** | `alert.critical`, `alert.warning` | Creación/escalado de alertas |
| **Jenkins** | `deploy.success`, `deploy.failed`, `workflow.run` | Al completar un build (async tras trigger) |
| **Terraform** | `deploy.success`, `deploy.failed`, `change.create` | Apply, destroy y plan completados |
| **GitHub Deployments** | `deploy.success`, `deploy.failed`, `workflow.run` | Al finalizar un despliegue |
| **VPS** | `backup.completed` | Tras `createFleetBackup` |
| **Command Center** | `ops.completed`, `change.create` | Reinicio instancia, escalado K8s, sync inventario (sin duplicar Jenkins/Terraform/VPS) |
| **Integraciones** | `integration.enabled`, `integration.test` | Activar integración o probar conexión |

Consulta el catálogo en vivo: `GET /api/v1/integrations/sources`

## Eventos suscritos por defecto

- **Slack**: alertas, despliegues, workflows, backups, ops, integración activada
- **PagerDuty**: alertas críticas/warning, deploy fallido, ops
- **Jira**: cambios (plan/sync), despliegues, backups

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/integrations/status` | Modo demo/live y mensaje |
| GET | `/api/v1/integrations/sources` | Catálogo de fuentes del panel |
| GET | `/api/v1/integrations` | Lista configuraciones |
| PATCH | `/api/v1/integrations/:id` | Activar/desactivar, config, eventos |
| POST | `/api/v1/integrations/:id/test` | Probar conexión |
| GET | `/api/v1/integrations/deliveries` | Log de entregas recientes |

## Migración

```bash
cd apps/backend-api && npx prisma migrate deploy
```
