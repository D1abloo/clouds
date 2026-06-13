# Cloud Launch Performance Improvements

## Cambios aplicados

Se optimizó `CloudCatalogCacheService` para reducir peticiones repetidas durante el wizard:

- Caché temporal por clave de catálogo.
- Dedupe de peticiones concurrentes con `shareReplay`.
- Invalidación por prefijo para cambios de proveedor, cuenta o región.
- Limpieza de peticiones en curso al invalidar.

## Catálogos beneficiados

El wizard reutiliza caché para:

- Regiones
- Imágenes
- Tipos de instancia / planes
- Redes
- Security groups / firewalls / NSG
- SSH keys

## Carga paralela

El paso de catálogo lanza en paralelo:

- `images`
- `instance-types`
- `networks`
- `security-groups`
- `key-pairs`

El loader ahora espera las cinco familias de datos, evitando estados incompletos donde desaparecía el loading antes de resolver las SSH keys.

## Validación y UX

- Los checks locales detectan cuenta, región, zona, red, firewall/SG/NSG, SSH key, compute, imagen y disco.
- `Next` muestra qué campo falta.
- El preflight muestra sugerencias para crear dependencias inline.
- Los filtros de imagen y tipo trabajan en memoria sobre catálogos cacheados.

## Pruebas realizadas

- `npm run build -w apps/frontend-angular -- --configuration=production`

