# Account preservation check

Fecha: 2026-06-12

## Archivos revisados

- `apps/backend-api/prisma/schema.prisma`
- `apps/backend-api/src/modules/cloud-accounts/cloud-accounts.service.ts`
- `apps/backend-api/src/modules/cloud-accounts/cloud-adapter.context.ts`
- `scripts/lib/clear-demo-data.ts`
- `scripts/lib/clear-demo-vps-data.ts`
- `scripts/cleanup-production-demo-data.ts`
- `scripts/cleanup-production-demo-vps.ts`
- `package.json`
- `apps/backend-api/package.json`

## Resultado

- Cuentas cloud: preservadas.
- Credenciales cifradas / `secretRef`: preservadas.
- Usuarios, proyectos, workspaces e inventario: preservados.
- Logs existentes: preservados.
- Migraciones: no ejecutadas.
- Seeds/resets/cleanup: no ejecutados.

## Motivo

Los scripts de limpieza contienen operaciones `deleteMany` y comandos `reset/clear`; aunque estan orientados a datos demo, no se ejecutaron para evitar cualquier riesgo sobre datos existentes.
