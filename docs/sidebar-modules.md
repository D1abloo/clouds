# Sidebar navigation — Spendlyx

## Regla de navegación

1. **Un solo nivel desplegable** en el sidebar: cada grupo (Overview, Security, Admin…) se expande/colapsa con el chevron. No hay acordeones dentro de acordeones.
2. **Enlaces directos** bajo cada grupo (Security Center, Secrets Manager…), sin duplicar el nombre del grupo.
3. **Tabs en el panel principal** (`app-module-area-tabs`) para la misma área, sin hacer scroll largo solo en el sidebar.

## Módulos del sidebar visibles

| Módulo | Clic en cabecera | Contenido al expandir |
|--------|------------------|------------------------|
| Resumen | Abre/cierra | Tablero, Centro de mando, Explorador de recursos, Mapa de topología, Centro de salud. |
| Nubes | Abre/cierra | AWS, GCP, Azure y Clouding con opciones internas por proveedor. |
| VPS | Abre/cierra | DigitalOcean, Hetzner, Linode, OVH, IONOS, Vultr y Scaleway. |
| Infraestructura | Abre/cierra | Instancias, Docker, Kubernetes, Red, Almacenamiento, Copias de seguridad y Planificador de capacidad. |
| Automatización | Abre/cierra | Jenkins, AI Infra Studio, Despliegues, Sesiones activas, Historial, Runbooks, Programador, Catálogo y Aprobaciones. |
| Repositorios | Abre/cierra | GitHub, GitLab, webhooks, ramas, commits, PR/MR y despliegues. |
| Observabilidad | Abre/cierra | Métricas, Logs, Facturación, Optimizador de costes, Alertas, Incidentes, Notificaciones, Informes y Gestión de cambios. |
| Seguridad | Abre/cierra | Centro de seguridad, Gestor de secretos, Cumplimiento, Control de acceso y Auditoría. |
| Administración | Abre/cierra | Usuarios, Roles, Tokens API, Webhooks, Configuración y Asistente IA. |

## Tabs en panel principal (ejemplos)

**Seguridad:** Centro de seguridad · Gestor de secretos · Cumplimiento · Control de acceso · Auditoría

**Administración:** Usuarios · Roles · Tokens API · Webhooks · Configuración · Asistente IA

**Nubes:** AWS · GCP · Azure · Clouding (sub-tabs Resumen/Cuentas/EC2… siguen en la página del proveedor)

**Infraestructura:** Instancias · Docker · Kubernetes · Red · Almacenamiento · Copias · Capacidad

## FinOps

La sección principal FinOps fue eliminada del sidebar visible el 2026-06-12. Las rutas internas antiguas `/finops/*` quedan fuera del menú y no deben enlazarse desde navegación visible.

## Búsqueda

- Sidebar search: busca páginas internas (muestra resultados al buscar)
- Command palette (Ctrl+K): módulos principales + páginas frecuentes

## Configuración

Definida en `apps/frontend-angular/src/app/core/routing/area-nav.config.ts`
