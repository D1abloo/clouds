# Sidebar navigation — CloudOps Control Center

## Regla de navegación (Fase 32)

**El sidebar es solo navegación principal.** No hay listas largas ni acordeones anidados.

Las opciones internas de cada área se muestran en el **panel principal** como tabs/chips (`app-module-area-tabs`), no dentro del sidebar.

## Módulos del sidebar (7)

| Módulo | Ruta por defecto |
|--------|------------------|
| Overview | `/dashboard` |
| Clouds | `/cloud/aws/overview` |
| Infrastructure | `/instances/all-instances` |
| Automation | `/jenkins/jobs` |
| Observability | `/metrics/overview` |
| Security | `/security-center` |
| Admin | `/admin/users` |

## Tabs en panel principal (ejemplos)

**Security:** Security Center · Secrets Manager · Compliance · Access Control · Audit

**Admin:** Users · Roles · API Tokens · Webhooks · Settings · Demo Mode · AI Assistant

**Clouds:** AWS · GCP · Azure (sub-tabs Overview/Accounts/EC2… siguen en la página del proveedor)

**Infrastructure:** Instances · VPS · Docker · Kubernetes · Network · Storage · Backups · Capacity Planner

## Búsqueda

- Sidebar search: busca páginas internas (muestra resultados al buscar)
- Command palette (Ctrl+K): módulos principales + páginas frecuentes

## Configuración

Definida en `apps/frontend-angular/src/app/core/routing/area-nav.config.ts`
