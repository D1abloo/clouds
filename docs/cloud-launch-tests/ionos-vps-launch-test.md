# IONOS VPS — Prueba de integración

**Fecha:** 2026-06-12
**Entorno local:** `/home/isaac/Escritorio/SAAS`
**Credenciales locales:** `IONOS_TOKEN` missing

## Objetivo

Integrar IONOS VPS en el mismo wizard (`IonosVpsLaunchForm`, proveedor en selector).

## UI implementada

- Selector de proveedor incluye **IONOS VPS**
- Formulario dedicado: cuenta IONOS, region, datacenter, plan VPS, CPU, RAM, disco, sistema operativo, SSH key y nombre.
- Paso Red en `studioMode` usa `app-ionos-vps-launch-form`.
- Lanzamiento local registra inventario, logs, coste y permite probar/eliminar desde UI.

## Prueba de conectividad VPS

| Variable | Estado local |
|----------|------------------------------|
| `IONOS_TOKEN` | missing |

**Resultado API real:** No ejecutado — falta token IONOS.

## Backend

- Lanzamiento real IONOS requiere `IONOS_TOKEN` y adaptador backend IONOS.
- Mientras tanto, el wizard usa registro local para inventario/logs/FinOps y simula creacion/prueba/eliminacion sin dejar recursos activos.

## Estado

| Ítem | Estado |
|------|--------|
| UI wizard IONOS | Completado |
| Lanzamiento real | Bloqueado — falta `IONOS_TOKEN`/adaptador cloud |
| Instancias test | 0 |

## Acción recomendada

1. Configurar `IONOS_TOKEN` fuera del repositorio.
2. Implementar adaptador backend IONOS si se quiere crear VPS reales desde API.
