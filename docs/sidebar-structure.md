# Estructura del sidebar

Fecha: 2026-06-12

## Configuracion real

| Pieza | Archivo |
| --- | --- |
| Configuracion principal del sidebar | `apps/frontend-angular/src/app/core/routing/area-nav.config.ts` |
| Rutas privadas | `apps/frontend-angular/src/app/core/routing/navigation.routes.ts` |
| Etiquetas de rutas | `apps/frontend-angular/src/app/core/routing/route-labels.ts` |
| Layout autenticado | `apps/frontend-angular/src/app/layout/main-layout/main-layout.component.ts` |
| Render del sidebar | `apps/frontend-angular/src/app/layout/sidebar/sidebar.component.ts` |
| Busqueda del sidebar | `apps/frontend-angular/src/app/layout/sidebar/sidebar-search.component.ts` |

## Secciones visibles tras limpieza

| Seccion | Ruta base | Estado |
| --- | --- | --- |
| Resumen | `/dashboard` | Conservada. |
| Nubes | `/cloud/aws/overview` | Conservada con AWS, GCP, Azure y Clouding. |
| VPS | `/vps/digitalocean/overview` | Conservada con DigitalOcean, Hetzner, Linode, OVH, IONOS, Vultr y Scaleway. |
| Infraestructura | `/instances/all-instances` | Conservada. |
| Automatizacion | `/jenkins/jobs` | Conservada con AI Infra Studio en `/automation/ai-infra-studio`. |
| Repositorios | `/repositories/github` | Conservada. |
| Observabilidad | `/metrics/overview` | Conservada con metricas, logs, facturacion, optimizador, alertas e informes. |
| Seguridad | `/security-center` | Conservada. |
| Administracion | `/admin/users` | Conservada. |

## FinOps

La seccion principal `FinOps` fue retirada de `SIDEBAR_MAIN_MODULES`. Por tanto no aparece en:

- menu lateral,
- busqueda del sidebar basada en `flattenAreaNavForSearch`,
- tabs principales derivados del sidebar.

Las rutas internas antiguas `/finops/*` se mantienen por compatibilidad porque el requisito no exige borrar logica interna si otras partes la usan. Sus breadcrumbs y etiquetas visibles se neutralizaron como "Costes cloud", "Panel de costes", "Facturacion cloud", etc.

## Test de regresion

`apps/frontend-angular/src/app/core/pro-production-ui.spec.ts` incluye una asercion para evitar que `finops` vuelva a aparecer como seccion principal visible.
