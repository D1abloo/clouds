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

## Cloud accounts — conexión PRO

- **Centro de integraciones**: `/settings/integrations` — tabla multi-cuenta (cloud, VPS, GitHub) con acciones sincronizar/editar.
- **Asistente gráfico 6 pasos** (página admin): `/admin/configuracion/integraciones/:provider/conectar` y `/nueva` para `aws|gcp|azure|kubernetes|docker|…`.
- **VPS / Bare metal**: `/admin/infraestructura/vps/nuevo` — SSH, validación `POST /api/v1/vps/validate-preview`, guardado en `VpsServer`.
- Modal **Conectar cuenta** (empty states): `IntegrationConnectionService.openWizardDialog()` sin salir del panel.
- Validación cloud: `POST /api/v1/cloud-accounts/validate-preview` (AWS/GCP/Azure vía adapters SDK).
- Credenciales cifradas en vault (`SecretsVaultService`); audit: `cloud_account.create`, `validate_preview`, `vps.validate_preview`, `sync_*`.
- **Métodos de credencial**:
  - AWS: IAM Role (ARN), Access Key, OIDC
  - GCP: Service Account JSON, Workload Identity
  - Azure: App Registration (Client Secret), Managed Identity
  - VPS: SSH (recomendado), agente (próximamente), registro manual
  - Kubernetes: kubeconfig o Bearer Token
  - Docker: TLS + endpoint o túnel SSH
- **Guards**: `publicGuestGuard` en marketing; wildcard → `/dashboard` (nunca sitio público).
- **Alias**: `/admin/configuracion/integraciones` → `/settings/integrations`; `/accounts` → `/cloud/aws/accounts`.

## Credenciales cloud para pruebas (AWS / GCP)

Las credenciales **no van en git**. Usa `infra/.env.cloud` (gitignored) y sincroniza a la VPS:

```bash
# Genera infra/.env.cloud desde ~/Descargas (o edita a mano)
bash scripts/build-env-cloud.sh

# Sube AWS/GCP a /opt/cloudops/infra/.env y registra cuentas en PostgreSQL
npm run sync:cloud-env

# Lanza instancias de prueba (solo GCP si ya lanzaste AWS)
ADMIN_EMAIL=admin@spendlyx.com ADMIN_PASSWORD='…' LAUNCH_AWS=false npm run launch:cloud-test
```

### AWS — permisos IAM mínimos

Usuario o rol con política que incluya al menos:

| Acción | Uso en Spendlyx |
|--------|-----------------|
| `ec2:RunInstances` | Lanzar instancias |
| `ec2:DescribeInstances` | Inventario y sync |
| `ec2:DescribeImages` | Selector de AMI |
| `ec2:DescribeSubnets` | Subred para lanzamiento |
| `ec2:DescribeSecurityGroups` | Grupo de seguridad |
| `ec2:StartInstances` / `StopInstances` / `RebootInstances` | Operaciones |
| `sts:GetCallerIdentity` | Validar conexión |

Rol gestionado recomendado: **`AmazonEC2FullAccess`** (pruebas) o política custom acotada a una VPC.

Variables en `infra/.env.cloud`:

```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-1
```

### GCP — roles IAM exactos

1. **Habilitar API:** [Compute Engine API](https://console.cloud.google.com/apis/library/compute.googleapis.com) en el proyecto.
2. **IAM → cuenta de servicio** usada en el JSON → **Conceder acceso**:

| Rol (ID) | Para qué |
|----------|----------|
| **`roles/compute.instanceAdmin.v1`** | Crear, listar, arrancar y parar VMs (`compute.instances.insert`, etc.) |
| **`roles/compute.networkUser`** | Usar la VPC/red por defecto al insertar instancias |
| **`roles/iam.serviceAccountUser`** | Solo si la VM usa otra cuenta de servicio como identidad |

Alternativa amplia (solo entornos de prueba): **`roles/compute.admin`**.

3. **Zona:** Spendlyx usa `europe-west1-b` por defecto en lanzamientos de prueba (`GCP_ZONE` en el script). Si falla `Permission denied on locations/europe-west1-a`, define zona explícita:

```bash
GCP_ZONE=europe-west1-b LAUNCH_AWS=false npm run launch:cloud-test
```

4. **Validar** en el panel: Nubes → GCP → Cuentas → **Validar conexión**, o:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  https://spendlyx.com/api/v1/cloud-accounts/<ID_GCP>/validate
```

Variables en `infra/.env.cloud` (JSON en base64, no en texto plano en `.env`):

```env
GCP_PROJECT_ID=tu-proyecto
GCP_SERVICE_ACCOUNT_JSON_B64=<salida de build-env-cloud.sh>
```

### Cifrado de credenciales en BD

`scripts/provision-pro-resources.js` usa el mismo formato que `SecretsVaultService` (`vault:enc:v1:` + `VAULT_ENCRYPTION_KEY`). Si las cuentas no validan tras migrar claves, borra cuentas cloud en BD y vuelve a ejecutar `npm run sync:cloud-env`.

```bash
# Migraciones (local o en contenedor backend)
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

## GitHub / GitLab — integración de repositorios PRO

- **Hub**: `/settings/integrations` y `/admin/configuracion/integraciones`
- **Wizard**: `/admin/configuracion/integraciones/github/conectar` | `.../gitlab/conectar`
- **Detalle multi-cuenta**: `/repositories/github/:connectionId` | `/repositories/gitlab/:connectionId`
- Tokens PAT cifrados con `SecretsVaultService` (`VAULT_ENCRYPTION_KEY` en `infra/.env`)
- Validación previa: `POST /api/v1/github/accounts/validate-preview` | `POST /api/v1/gitlab/accounts/validate-preview`
- Preview repos: `POST /api/v1/github/accounts/preview-repos` | `POST /api/v1/gitlab/accounts/preview-projects`
- OAuth integración repositorios: muestra «Próximamente» si `GITHUB_CLIENT_ID` no está configurado; login OAuth sigue en `/login`

Variables adicionales (opcionales para OAuth futuro de integraciones):

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=
VAULT_ENCRYPTION_KEY=
```

> **Nota:** La URL de callback de GitHub es `/api/v1/auth/oauth/callback/github`, no `/api/v1/auth/oauth/github` (esta última es solo el inicio del flujo).

### Verificación OAuth en producción (2026-06-08)

| Comprobación | Resultado |
|--------------|-----------|
| Botón Google en `/login` | OK — redirige a `accounts.google.com` |
| Botón GitHub en `/login` | OK — redirige a `github.com/login/oauth` |
| Callback Google registrado | `https://spendlyx.com/api/v1/auth/oauth/callback/google` |
| Callback GitHub registrado | `https://spendlyx.com/api/v1/auth/oauth/callback/github` |
| `platform/status` → `oauth.google/github` | `true` / `true` |
| Modo demo oculto en login | OK (`DEMO_MODE=false`) |
| Rutas protegidas sin sesión | Redirigen a `/login` |
| Errores OAuth en español | OK (`access_denied`, códigos inválidos) |
| Secretos en respuestas API | No expuestos (solo client IDs públicos en redirect) |
| Cuentas OAuth en PostgreSQL | `oauth_accounts` activo (Google verificado) |
| Auditoría `oauth_login` | Registrada en `audit_logs` |

Comprobar variables en VPS (valores enmascarados):

```bash
ssh root@82.223.54.195 "grep -E '^(GOOGLE_|GITHUB_|OAUTH_|AUTH_URL|DEMO_MODE|PRO_MODE)=' /opt/cloudops/infra/.env | sed 's/SECRET=.*/SECRET=***/'"
```

Prueba rápida de inicio OAuth:

```bash
curl -sS https://spendlyx.com/api/v1/auth/oauth/google | jq '{proMode, redirectUri: (.redirectUrl | capture("redirect_uri=([^&]+)") | .[0] // empty)}'
curl -sS https://spendlyx.com/api/v1/auth/oauth/github | jq '{proMode, hasRedirect: (.redirectUrl != null)}'
```

Flujo completo tras login OAuth:

1. Proveedor redirige a `/api/v1/auth/oauth/callback/:provider?code=...`
2. Backend crea/actualiza usuario, marca email verificado, upsert `oauth_accounts`
3. Redirige a `/login/oauth/callback#token=...&user=...`
4. Frontend persiste JWT y accede a rutas `/dashboard`, `/admin/*`, etc.
5. Logout limpia `localStorage` y vuelve a `/login`

## SMTP (registro y contacto)

Correos transaccionales desde `info@spendlyx.com` vía Ionos. Variables en `infra/.env`:

```env
SMTP_HOST=smtp.ionos.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@spendlyx.com
SMTP_PASSWORD=
SMTP_FROM="Spendlyx <info@spendlyx.com>"
CONTACT_INBOX=info@spendlyx.com
```

Alternativa SSL: `SMTP_PORT=465`, `SMTP_SECURE=true`.

Sincronizar credenciales locales al VPS (sin commitear secretos):

```bash
./scripts/sync-spendlyx-env.sh
```

Tras cambios SMTP, reconstruir backend:

```bash
npm run deploy:spendlyx
```

Flujo: registro público → token verificación 24 h → login bloqueado hasta verificar. Ver `PUBLIC_FRONTEND.md`.

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

## Limpieza de datos demo en producción

Antes de ejecutar la limpieza en VPS, **haz backup de PostgreSQL**:

```bash
ssh root@82.223.54.195
cd /opt/cloudops/infra
docker compose exec -T postgres pg_dump -U cloudops cloudops > /root/backups/spendlyx-pre-cleanup-$(date +%Y%m%d).sql
```

### Comandos

```bash
# Simulación (sin cambios)
npm run cleanup:demo:dry-run

# Ejecución real (DEMO_MODE=false + confirmación explícita)
CONFIRM_DELETE_DEMO_DATA=true npm run cleanup:demo:production

# En VPS (contenedor backend)
docker compose exec -T backend-api sh -c 'cd /app && npm run cleanup:demo:dry-run'
docker compose exec -T backend-api sh -c 'cd /app && npm run cleanup:demo:production'
```

La limpieza:
- Elimina registros operativos con prefijo `demo-` (instancias, VPS, cuentas cloud, Jenkins, etc.)
- Soft-delete de usuarios `@demo.local` y nombres con demo/mock/fake/sample
- **Preserva** `admin@spendlyx.com` y usuarios preset `@spendlyx.com`
- Registra auditoría `production.demo_cleanup`

### Verificar tras limpieza

```bash
curl -s https://spendlyx.com/api/v1/platform/status | jq '.demoMode, .proMode'
npm run provision:spendlyx-users -- --admin --email admin@spendlyx.com
```

### Rollback

**Tag Git antes de limpieza demo:**

```bash
git tag demo-full-cleanup-backup-before-delete
# o restaurar: git checkout demo-full-cleanup-backup-before-delete
```

Restaurar backup PostgreSQL:

```bash
docker compose exec -T postgres psql -U cloudops cloudops < /root/backups/spendlyx-pre-cleanup-YYYYMMDD.sql
```

**Verificación sin demo tras deploy:**

```bash
npm run assert:no-demo
# o solo bundle ya construido:
npm run assert:no-demo:skip-build
```

**Rebuild sin caché en VPS (obligatorio tras cambios demo):**

```bash
ssh root@82.223.54.195
cd /opt/cloudops/infra
docker compose down   # no elimina volumen postgres
docker compose build --no-cache frontend backend-api
docker compose up -d
docker exec cloudops-backend npx prisma migrate deploy
npm run cleanup:demo:dry-run   # desde /opt/cloudops en host o exec backend
CONFIRM_DELETE_DEMO_DATA=true npm run cleanup:demo:production
docker compose restart frontend backend-api
```

## Reglas PRO

- Sin seed demo automático (`AUTO_DEMO_SEED=false`)
- Rutas `/github/demo/*` y `/demo/*` bloqueadas con `403` en PRO
- UI sin botón «Entrar en modo demo» ni banner demo
- Servicios devuelven listas vacías o «Configuración requerida», no datos fake
- `APP_ENV=production` en backend, `platform/status` y entornos Angular

## Correcciones de UX del panel PRO

| Cambio | Detalle |
|--------|---------|
| Sidebar colapsado | Secciones cerradas por defecto; solo la ruta activa se expande |
| Preferencias sidebar | Estado manual en `localStorage` (`cloudops_sidebar_expanded`) |
| Selector entorno | Eliminado Spendlyx / Production / Staging del sidebar |
| Badges sidebar | Solo contadores reales (alertas, notificaciones no leídas) |
| Notificaciones | `read_at`, `section`, API `unread-summary`, marcar leído/todas |
| Header | Sin badge PRO ni indicador WebSocket |
| Integraciones | Empty state corto: «Sin cuentas conectadas» + «Añadir cuenta» |

## Verificación post-despliegue (VPS)

Tras `npm run deploy:spendlyx`, validar producción:

```bash
bash scripts/verify-pro-vps.sh
```

Comprueba: estado PRO en `platform/status`, login sin demo, bundle sin strings prohibidos, API notificaciones protegida y health. Detalle completo en `ADMIN_PANEL_VERIFICATION.md` → sección «Verificación VPS — últimos 4 prompts».

## Rollback a demo

```bash
git checkout demo-backup-before-pro
```

Tag de respaldo: `demo-backup-before-pro`
