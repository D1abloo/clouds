# Spendlyx — Despliegue PRO (spendlyx.com)

## Flags de producción

```env
DEMO_MODE=false
PRO_MODE=true
APP_URL=https://spendlyx.com
AUTH_URL=https://spendlyx.com
AUTO_DEMO_SEED=false
INTEGRATIONS_LIVE=true
```

## PostgreSQL

```bash
# Migraciones
cd apps/backend-api && npx prisma migrate deploy

# Seed PRO (solo roles, permisos, admin — sin datos operativos fake)
SEED_MODE=production DEMO_MODE=false npx prisma db seed

# Seed demo (solo local/staging)
DEMO_MODE=true npm run prisma:seed:demo
```

## OAuth

| Proveedor | Callback URL |
|-----------|--------------|
| Google | `https://spendlyx.com/api/v1/auth/oauth/callback/google` |
| GitHub | `https://spendlyx.com/api/v1/auth/oauth/callback/github` |

Variables:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
AUTH_SECRET=
OAUTH_CALLBACK_URL=https://spendlyx.com/api/v1/auth/oauth/callback
```

Inicio OAuth (frontend): `GET /api/v1/auth/oauth/google` | `github`

## Docker en servidor

```bash
cd infra
cp .env.production.example .env   # rellenar secretos
./scripts/setup-domain-certs.sh   # SSL spendlyx.com
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env up -d --build
```

Panel: https://spendlyx.com  
Login inicial: `admin@cloudops.local` / `Admin123!` (cambiar en producción)

## Verificar modo PRO

```bash
curl -s https://spendlyx.com/api/v1/platform/status | jq
# demoMode: false, proMode: true, database.connected: true
```

```bash
npm run verify:admin-panel:build
```

## Rollback a demo

```bash
git checkout demo-backup-before-pro
# o rama main anterior al cutover
```

Tag de respaldo: `demo-backup-before-pro`  
Rama de cutover: `pro-clean-cutover`

## RBAC (seed PRO)

| Rol | Slug |
|-----|------|
| Superadministrador | `superadministrador` |
| Administrador | `administrador` |
| Operador | `operador` |
| Auditor | `auditor` |
| Solo lectura | `solo_lectura` |

Permisos: `usuarios.leer|crear|editar|eliminar`, `roles.gestionar`, `infraestructura.leer|gestionar`, `nubes.conectar`, `repositorios.conectar`, `seguridad.leer|gestionar`, `auditoria.leer`, `configuracion.gestionar`.

Configuración en `settings`: `nombre_app=Spendlyx`, `modo=PRO`, `dominio=https://spendlyx.com`, `idioma=es`.

## Reglas PRO

- Sin seed demo automático (`AUTO_DEMO_SEED=false`)
- Rutas `/github/demo/*` y `/demo/*` bloqueadas con `403` en PRO
- UI sin botón «Entrar en modo demo» ni banner demo
- Servicios devuelven listas vacías o «Configuración requerida», no datos fake
