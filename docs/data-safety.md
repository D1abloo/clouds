# Seguridad de datos

Fecha: 2026-06-12

## Alcance seguro de esta entrega

Los cambios realizados son frontend, rutas de navegacion y documentacion. No se modificaron:

- modelos Prisma,
- migraciones,
- seeders,
- scripts de limpieza,
- servicios backend de persistencia,
- registros de cuentas cloud,
- credenciales cifradas,
- usuarios, workspaces, inventario o logs existentes.

## Revision de scripts destructivos

Se buscaron terminos de riesgo: `delete`, `truncate`, `drop`, `reset`, `clear`, `remove all`, `seed overwrite`.

Hallazgos relevantes:

| Archivo/script | Riesgo | Decision |
| --- | --- | --- |
| `scripts/lib/clear-demo-data.ts` | Contiene `deleteMany` sobre datos demo y cuentas demo. | No ejecutado. |
| `scripts/cleanup-production-demo-data.ts` | Ejecuta limpieza demo en modo produccion con confirmaciones. | No ejecutado. |
| `scripts/lib/clear-demo-vps-data.ts` | Elimina VPS demo, sesiones SSH y ejecuciones demo. | No ejecutado. |
| `scripts/cleanup-production-demo-vps.ts` | Limpieza VPS demo con modo dry-run/produccion. | No ejecutado. |
| `apps/backend-api/package.json` | Incluye `prisma:seed:demo:reset`. | No ejecutado. |
| `package.json` | Incluye `demo:reset`, `purge:vps-demo-db` y scripts de cleanup. | No ejecutado. |

## Comandos permitidos en esta entrega

- Lectura de archivos con `rg` y `sed`.
- Build/lint/test sin ejecutar migraciones ni seeders.
- `git diff` y escaneo de secretos antes del commit.

## Secretos

Antes de commit se debe revisar:

- `git status --short`,
- `git diff --cached`,
- patrones de secretos en el diff staged,
- que no se hayan incluido `.env`, claves privadas ni tokens.
