# Sidebar cleanup

Fecha: 2026-06-12

## Archivos revisados

- `apps/frontend-angular/src/app/core/routing/area-nav.config.ts`
- `apps/frontend-angular/src/app/core/routing/navigation.routes.ts`
- `apps/frontend-angular/src/app/core/routing/route-labels.ts`
- `apps/frontend-angular/src/app/shared/theme/nav-visual.config.ts`
- `apps/frontend-angular/src/app/layout/sidebar/sidebar-nav.config.ts`
- `apps/frontend-angular/src/app/layout/sidebar/sidebar-tree.config.ts`
- `apps/frontend-angular/src/app/layout/sidebar/sidebar-search.component.ts`

## Cambios aplicados

- Se retiro el modulo principal `finops` de `SIDEBAR_MAIN_MODULES`.
- Se conservaron Resumen, Nubes, VPS, Infraestructura, Automatizacion, Repositorios, Observabilidad, Seguridad y Administracion.
- Se neutralizaron breadcrumbs y etiquetas de rutas internas `/finops/*` como "Costes cloud" para compatibilidad.
- Se anadio test para impedir que `finops` vuelva al sidebar visible.

## Verificacion

`rg "FinOps|finops"` sobre routing/sidebar muestra solo rutas internas antiguas y etiquetas neutralizadas; no hay modulo `finops` en `SIDEBAR_MAIN_MODULES`.
