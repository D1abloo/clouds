# Preservacion de cuentas conectadas

Fecha: 2026-06-12

## Donde se guardan las cuentas cloud

| Dato | Ubicacion |
| --- | --- |
| Cuenta cloud | `apps/backend-api/prisma/schema.prisma` modelo `CloudAccount`, tabla `cloud_accounts`. |
| Credenciales | Modelo `CloudCredential`, tabla `cloud_credentials`. |
| Referencia de secreto | Campo `secretRef` en `CloudCredential`. |
| Regiones sincronizadas | Modelo `CloudRegion`, tabla `cloud_regions`. |
| Instancias asociadas | Modelo `Instance`, campo `cloudAccountId`. |
| Carga de credenciales | `apps/backend-api/src/modules/cloud-accounts/cloud-adapter.context.ts`. |
| Creacion de cuenta | `apps/backend-api/src/modules/cloud-accounts/cloud-accounts.service.ts`. |

## Proveedores preservados

No se eliminan ni sobrescriben cuentas AWS, GCP, Azure, Clouding, IONOS ni proveedores VPS. Tampoco se tocan tokens API, credenciales cifradas, usuarios, proyectos, inventario o logs.

## Comportamiento observado

- `CloudAccountsService.create` crea la cuenta y guarda credenciales mediante `SecretsVaultService.storeSecrets`.
- `CloudAdapterContextLoader.load` lee credenciales con `SecretsVaultService.readSecrets(secretRef)`.
- Las consultas filtran cuentas activas con `deletedAt: null` en varios servicios.

## Garantia de esta entrega

No se ejecutaron migraciones, seeds, resets ni scripts de limpieza. Los cambios quedan limitados a navegacion, UI publica, tests de sidebar y documentacion.
