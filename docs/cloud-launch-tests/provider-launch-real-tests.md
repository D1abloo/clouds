# Provider launch real tests

## Alcance

La nueva interfaz permite lanzar desde el apartado visual de AI Infra Studio para AWS, Azure, GCP y Clouding. Las pruebas reales solo deben ejecutarse cuando existan credenciales con permisos explicitos para crear, probar y eliminar recursos temporales.

## Estado por proveedor

| Proveedor | UI visual | Preflight | Launch real | Eliminacion | Estado |
|---|---:|---:|---:|---:|---|
| AWS EC2 | OK | Integrado | Pendiente credenciales/permisos | Pendiente | No ejecutado para evitar coste |
| Azure VM | OK | Integrado | Pendiente credenciales/permisos | Pendiente | No ejecutado para evitar coste |
| GCP Compute Engine | OK | Integrado | Pendiente credenciales/permisos | Pendiente | No ejecutado para evitar coste |
| Clouding | OK | Integrado | Pendiente token/permisos | Pendiente | No ejecutado para evitar coste |

## Evidencia disponible

- Build Angular production OK.
- Cache Redis preparada para catalogos.
- Botones de crear dependencias, preview, validacion y launch estan conectados a acciones reales del wizard.
- Logs embebidos siguen activos mediante `CloudLaunchLogsComponent`.
- Inventario local se alimenta con `CloudLaunchActivityService` al completar lanzamientos.

## Recursos activos

No se han creado recursos cloud reales durante esta revision, por lo que no quedan recursos activos de prueba.

## Protecciones

No se han borrado cuentas, usuarios, workspaces, credenciales cifradas, logs, inventario existente ni tokens API. No se ejecuto `docker compose down -v`, `truncate`, `drop`, `reset db` ni limpieza destructiva.
