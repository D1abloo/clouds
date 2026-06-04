# Sidebar navigation — CloudOps Control Center

## Regla de navegación

1. **Un solo nivel desplegable** en el sidebar: cada grupo (Overview, Security, Admin…) se expande/colapsa con el chevron. No hay acordeones dentro de acordeones.
2. **Enlaces directos** bajo cada grupo (Security Center, Secrets Manager…), sin duplicar el nombre del grupo.
3. **Tabs en el panel principal** (`app-module-area-tabs`) para la misma área, sin hacer scroll largo solo en el sidebar.

## Módulos del sidebar (7 desplegables)

| Módulo | Clic en cabecera | Contenido al expandir |
|--------|------------------|------------------------|
| Overview | Abre/cierra | Dashboard, Command Center, Resource Explorer… |
| Clouds | Abre/cierra | AWS / GCP / Azure (cada uno desplegable → Overview, EC2/Compute/VMs, Network, Billing, Metrics) |
| Infrastructure | Abre/cierra | Instances, VPS, Docker, K8s… |
| Automation | Abre/cierra | Jenkins, Terraform, Terminal… |
| Observability | Abre/cierra | Metrics, Logs, Billing, Alerts… |
| Security | Abre/cierra | Security Center, Secrets, Compliance, Audit… |
| Admin | Abre/cierra | Users, Roles, Settings, Demo Mode… |

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
