# IONOS VPS — Prueba de integración

**Fecha:** 2026-06-12  
**Entorno:** https://spendlyx.com (PRO)

## Objetivo

Integrar IONOS VPS en el mismo wizard (`IonosVpsLaunchForm`, proveedor en selector).

## UI implementada

- Selector de proveedor incluye **IONOS VPS**
- Formulario dedicado: datacenter, plan, SO, SSH key, nombre
- Paso Red en studioMode usa `app-ionos-vps-launch-form`

## Prueba de conectividad VPS

| Variable | Estado en `infra/.env` (VPS) |
|----------|------------------------------|
| `IONOS_VPS_HOST` | Vacío |
| `IONOS_VPS_PORT` | Configurado |
| `IONOS_VPS_USER` | Configurado |
| `IONOS_VPS_SSH_KEY` | Presente (redactado) |

**Resultado SSH:** No ejecutable — `IONOS_VPS_HOST` sin valor en producción.

## Backend

- No existe adaptador `VPS`/`IONOS` en `CloudAdapterRegistry` (solo AWS, GCP, AZURE, CLOUDING).
- Lanzamiento real IONOS requiere API token IONOS Cloud o host SSH configurado.

## Estado

| Ítem | Estado |
|------|--------|
| UI wizard IONOS | Completado |
| Lanzamiento real | Bloqueado — sin host ni adaptador cloud |
| Instancias test | 0 |

## Acción recomendada

1. Completar `IONOS_VPS_HOST` en `infra/.env` del servidor.
2. O conectar cuenta IONOS vía panel VPS (`/vps/ionos/accounts`).
