# Redis cache performance

## Backend

Se agrego cache Redis en `CloudAccountsService` para consultas de catalogo no sensibles:

- regiones,
- zonas,
- redes,
- subnets,
- security groups / firewalls / NSG,
- imagenes / AMIs,
- tipos de instancia / VM sizes,
- key pairs publicos.

## Claves y TTL

Formato de clave:

```text
cloudCatalog:<provider>:<accountId>:<region>:<resourceType>
```

TTL configurable:

```text
CLOUD_CATALOG_CACHE_TTL_SECONDS=600
```

## Seguridad

- No se cachean secretos.
- No se cachean credenciales.
- No se cachean tokens.
- Redis es una optimizacion: si falla, el registry del proveedor sigue siendo la fuente de verdad.

## Invalidacion

Se invalida el prefijo de cuenta tras:

- crear subnet,
- lanzar instancia.

## Frontend

El frontend conserva `CloudCatalogCacheService` con:

- `shareReplay`,
- deduplicacion de peticiones en vuelo,
- TTL local,
- invalidacion por prefijo,
- filtros de imagen/tipo en memoria.

## Pruebas

- Build Angular production: OK.
- Verificacion completa backend pendiente de `npm test -w apps/backend-api`.
