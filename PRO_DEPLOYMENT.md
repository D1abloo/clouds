# Spendlyx — Despliegue PRO (spendlyx.com)

Rama de cutover: `pro-live-cutover`  
Servidor VPS: `root@82.223.54.195` (`/opt/cloudops`)

## Flags de producción

```env
APP_ENV=production
DEMO_MODE=false
PRO_MODE=true
APP_URL=https://spendlyx.com
AUTH_URL=https://spendlyx.com
AUTO_DEMO_SEED=false
INTEGRATIONS_LIVE=true
```

## PostgreSQL

```bash
# Migraciones (local o en contenedor backend)
cd apps/backend-api && npx prisma migrate deploy

# En VPS tras deploy
ssh root@82.223.54.195
cd /opt/cloudops/infra
docker compose -f docker-compose.yml -f docker-compose.production.yml exec -T backend-api \
  npx prisma migrate deploy --schema=apps/backend-api/prisma/schema.prisma

# Seed PRO (roles, permisos, organización, admin — sin datos operativos fake)
SEED_MODE=production DEMO_MODE=false npx prisma db seed

# En VPS
docker compose -f docker-compose.yml -f docker-compose.production.yml exec -T backend-api \
  sh -c 'SEED_MODE=production DEMO_MODE=false npx prisma db seed --schema=apps/backend-api/prisma/schema.prisma'

# Seed demo (solo local/staging)
DEMO_MODE=true npm run prisma:seed:demo
```

## Organización multi-usuario

El seed PRO crea:

| Recurso | Valor |
|---------|-------|
| Organización | `Spendlyx` (slug: `spendlyx`) |
| Espacio de trabajo | Proyecto `default` vinculado a la organización |
| Admin | `admin@cloudops.local` / `Admin123!` con rol `superadministrador` y membresía `OWNER` |

Modelos Prisma: `Organization`, `Membership` (`OWNER` \| `ADMIN` \| `MEMBER`), `Project.organizationId`.

## OAuth

| Proveedor | Callback URL (registrar en consola del proveedor) |
|-----------|--------------------------------------------------|
| Google | `https://spendlyx.com/api/v1/auth/oauth/callback/google` |
| GitHub | `https://spendlyx.com/api/v1/auth/oauth/callback/github` |

Variables en `infra/.env`:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
AUTH_SECRET=
OAUTH_CALLBACK_URL=https://spendlyx.com/api/v1/auth/oauth/callback
APP_URL=https://spendlyx.com
AUTH_URL=https://spendlyx.com
```

Inicio OAuth (frontend): `GET /api/v1/auth/oauth/google` | `GET /api/v1/auth/oauth/github`

## Despliegue VPS (rsync + Docker)

Desde el workspace local (rama `pro-live-cutover`):

```bash
npm run deploy:spendlyx
# REMOTE_HOST=root@82.223.54.195 REMOTE_DIR=/opt/cloudops (por defecto)
```

El script:

1. Sincroniza código vía `rsync` (preserva `infra/.env` del servidor)
2. Sincroniza certificados SSL desde `infra/certs/`
3. Reconstruye `postgres`, `redis`, `backend-api`, `frontend` con `docker-compose.production.yml`

Tras el primer deploy o migraciones nuevas, ejecutar en el servidor:

```bash
ssh root@82.223.54.195
cd /opt/cloudops/infra
docker compose -f docker-compose.yml -f docker-compose.production.yml exec -T backend-api \
  npx prisma migrate deploy --schema=apps/backend-api/prisma/schema.prisma
docker compose -f docker-compose.yml -f docker-compose.production.yml exec -T backend-api \
  sh -c 'SEED_MODE=production DEMO_MODE=false npx prisma db seed --schema=apps/backend-api/prisma/schema.prisma'
```

## Docker manual en servidor

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
# demoMode: false, proMode: true, appEnv: "production", database.connected: true
```

```bash
npm run verify:admin-panel:build
```

## RBAC (seed PRO)

| Rol | Slug |
|-----|------|
| Superadministrador | `superadministrador` |
| Administrador | `administrador` |
| Operador | `operador` |
| Auditor | `auditor` |
| Solo lectura | `solo_lectura` |

Permisos: `usuarios.leer|crear|editar|eliminar`, `roles.gestionar`, `infraestructura.leer|gestionar`, `nubes.conectar`, `repositorios.conectar`, `seguridad.leer|gestionar`, `auditoria.leer`, `configuracion.gestionar`, `automatizacion.gestionar`, `observabilidad.leer`.

Configuración en `settings`: `nombre_app=Spendlyx`, `modo=PRO`, `dominio=https://spendlyx.com`, `idioma=es`.

## Reglas PRO

- Sin seed demo automático (`AUTO_DEMO_SEED=false`)
- Rutas `/github/demo/*` y `/demo/*` bloqueadas con `403` en PRO
- UI sin botón «Entrar en modo demo» ni banner demo
- Servicios devuelven listas vacías o «Configuración requerida», no datos fake
- `APP_ENV=production` en backend, `platform/status` y entornos Angular

## Rollback a demo

```bash
git checkout demo-backup-before-pro
```

Tag de respaldo: `demo-backup-before-pro`
