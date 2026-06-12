# Project audit - AI Infra Studio launch UI

**Fecha:** 2026-06-12
**Rama:** `pro-live-cutover`

## Alcance revisado

| Area | Archivo / ruta | Resultado |
| --- | --- | --- |
| Sidebar real | `apps/frontend-angular/src/app/core/routing/area-nav.config.ts` | La entrada canonica de AI Infra Studio vive en Automatizacion. AWS/GCP/IONOS usan ramas existentes. |
| Layout principal | `apps/frontend-angular/src/app/layout/main-layout/main-layout.component.ts` | Mantiene `app-sidebar`, tabs de area y `router-outlet`; no se creo navegacion paralela. |
| Router privado | `apps/frontend-angular/src/app/core/routing/navigation.routes.ts` | `/automation/ai-infra-studio` es canonica; `/infra/ai-studio` redirige. |
| Wizard | `features/cloud/cloud-launch-wizard.component.*` | Wizard visible con 10 pasos, logs, preflight, lanzar, probar y eliminar. |
| Formularios proveedor | `features/cloud/launch/*-launch-form.component.ts` | AWS, GCP e IONOS renderizan formularios propios. |
| Inventario | `features/instances/instances-list.component.ts` | Mezcla backend + recursos registrados por AI Infra Studio. |
| Logs | `features/observability/launch-logs-panel.component.ts` | Observabilidad -> Logs muestra eventos del wizard. |
| FinOps | `features/finops/finops-instances-page.component.ts` | Instancias FinOps incluye coste estimado de recursos del wizard. |

## Variables cloud disponibles

Comprobacion local sin imprimir secretos:

| Variable | Estado |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | missing |
| `AWS_SECRET_ACCESS_KEY` | missing |
| `AWS_REGION` | missing |
| `GOOGLE_APPLICATION_CREDENTIALS` | missing |
| `GCP_PROJECT_ID` | missing |
| `IONOS_TOKEN` | missing |

No se ejecutaron lanzamientos reales desde esta sesion local por falta de credenciales.

## Seguridad

- No se modifico ni stageo `.env`.
- No se añadieron tokens, claves privadas ni JSON de service accounts.
- Los cambios sucios previos en backend/login/docker se dejaron fuera de los commits de UI.

## Estado final

La UI esta integrada en rutas reales, compila con `npm run build -w apps/frontend-angular` y queda preparada para ejecutar pruebas reales cuando existan credenciales cloud.
