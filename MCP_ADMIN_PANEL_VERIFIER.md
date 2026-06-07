# MCP — Admin Panel PRO Verifier

Servidor MCP **`admin-panel-pro-verifier-mcp`** para verificar que el panel CloudOps está listo para pasar de Demo Mode a PRO Mode.

## Instalación

```bash
cd tools/admin-panel-pro-verifier-mcp
npm install
npm run build
```

Desde la raíz del monorepo:

```bash
npm run verify:admin-panel
```

Genera `ADMIN_PANEL_VERIFICATION.md` en la raíz.

## Conectar a Cursor

1. Asegúrate de haber ejecutado `npm run build` en `tools/admin-panel-pro-verifier-mcp`.
2. Copia la configuración de `.mcp.json` a **Cursor Settings → MCP** (o usa el archivo del proyecto si Cursor lo detecta).
3. Reinicia Cursor.

```json
{
  "mcpServers": {
    "admin-panel-pro-verifier-mcp": {
      "command": "node",
      "args": ["tools/admin-panel-pro-verifier-mcp/dist/index.js"],
      "env": { "PROJECT_ROOT": "/ruta/absoluta/a/SAAS" }
    }
  }
}
```

## Herramientas expuestas

| Tool | Propósito |
|------|-----------|
| `scan_project_structure` | Framework, ORM, env, tests |
| `scan_sidebar_routes` | Menú lateral + rutas |
| `verify_page_functionality` | Páginas no mockup |
| `verify_design_quality` | Checklist visual |
| `verify_official_logos` | Logos AWS/GCP/Azure/etc. |
| `verify_demo_mode` | DEMO_MODE y seeds |
| `verify_pro_mode_readiness` | Env, OAuth, migraciones |
| `verify_api_coverage` | Módulos backend |
| `verify_postgresql_schema` | Tablas Prisma |
| `run_database_migrations` | `prisma migrate deploy` (allowlist) |
| `seed_demo_data` | Seed demo |
| `verify_login` | Login ES + OAuth |
| `run_quality_checks` | Build/lint (allowlist) |
| `run_e2e_sidebar_tests` | Playwright |
| `generate_admin_panel_verification_report` | Informe final |

## Seguridad

- Solo comandos en allowlist (`commandRunner.ts`).
- Secretos enmascarados en salida.
- No imprime `GOOGLE_CLIENT_SECRET`, `DATABASE_URL` completos, etc.

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `PROJECT_ROOT` | Raíz del monorepo (obligatoria en MCP) |
| `DEMO_MODE` | `true` en demo |
| `PRO_MODE` | `false` hasta verificación |
| `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` | OAuth PRO |
| `DATABASE_URL` | PostgreSQL |

## Flujo recomendado antes de PRO

1. `npm run docker:up` (PostgreSQL)
2. `npm run prisma:migrate`
3. `npm run seed:demo`
4. `npm run dev:backend` + `npm run dev:frontend`
5. Login → recorrer sidebar
6. `npm run verify:admin-panel`
7. Revisar `ADMIN_PANEL_VERIFICATION.md`
8. Si `READY_FOR_PRO`, configurar credenciales reales y `DEMO_MODE=false`

## Interpretar el informe

- **READY_FOR_PRO**: sin bloqueantes automáticos; revisar OAuth/cloud manualmente.
- **NOT_READY_FOR_PRO**: corregir ítems en «Elementos faltantes» y «Riesgos restantes».

Regla Cursor asociada: `.cursor/rules/admin-panel-pro-verification.mdc`
