# Facturación y costes

## Visión general

CloudOps agrega costes de múltiples proveedores cloud y los expone en `/api/v1/billing`.

## Fuentes de datos

- APIs de billing AWS Cost Explorer, GCP Billing, Azure Cost Management (adaptadores cloud)
- Sincronización periódica vía `BillingSyncWorker` en `apps/workers`

## Worker

`BillingSyncWorker` ejecuta ticks según `WORKERS_BILLING_SYNC_INTERVAL_MS` (default 1 h).

En desarrollo:

```bash
npm run dev:workers
```

## API

| Endpoint | Descripción |
|----------|-------------|
| `GET /billing/summary` | Resumen por proyecto/período |
| `GET /billing/breakdown` | Desglose por servicio/recurso |

(Implementación detallada en `BillingModule`.)

## Multi-tenant

Los costes se filtran por `projectId` según permisos RBAC del usuario.

## Alertas de presupuesto

Configurar reglas en `/api/v1/alerts` con umbrales de gasto; `AlertEvaluator` worker (futuro) evaluará condiciones.

## Recomendaciones

- Etiquetar recursos cloud con `project` y `cost-center`
- Revisar desviaciones semanalmente
- No almacenar facturas PDF con PII en logs
