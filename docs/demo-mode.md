# Demo Mode — CloudOps Control Center

Modo demo completo para probar la aplicación **sin conectar AWS, GCP, Azure, Jenkins ni SSH reales**.

## Activación

```bash
cp .env.example .env   # DEMO_MODE=true
docker compose -f infra/docker-compose.yml up -d
npm run demo:seed      # carga base + dataset demo
# o reset completo:
npm run demo:reset
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run demo:seed` | Base seed + dataset demo |
| `npm run demo:reset` | Limpia demo y recarga |
| `npm run prisma:seed:demo` | Solo dataset demo (CLI) |
| `POST /api/v1/demo/seed` | Cargar demo vía API |
| `POST /api/v1/demo/reset` | Reset demo vía API |
| `GET /api/v1/demo/status` | Estado y contadores |

## Usuario demo principal

| Campo | Valor |
|-------|-------|
| Email | `demo@cloudops.local` |
| Password | `Demo1234!` |
| Rol | super_admin |

También: `admin@cloudops.local` / `Admin123!`

## Dataset incluido

| Recurso | Cantidad |
|---------|----------|
| Cuentas cloud | 3 (AWS Demo Account, GCP Demo Project, Azure Demo Subscription) |
| Instancias EC2/CE/VM | 18 (6 por proveedor) |
| VPS externas | 8 |
| Métricas | 24h × 5 tipos × instancia (CPU, RAM, disco, red) |
| Docker containers | 8 |
| Kubernetes resources | 13 |
| Jenkins jobs | 6 + builds |
| Terraform runs | 4 |
| Alertas activas | 9 |
| Notificaciones | 5 |
| Audit events | 9 |
| Billing | AWS, GCP, Azure, VPS |

## Instancias AWS (ejemplo)

- `aws-prod-web-01`, `aws-prod-api-01`, `aws-prod-db-01`
- `aws-staging-worker-01`, `aws-dev-docker-01`, `aws-k8s-node-01`

Regiones: `eu-west-1`, `eu-south-2`, `us-east-1`

## Frontend

- Banner **Demo Mode** visible en todas las pantallas autenticadas
- Badge **DEMO** en listado y detalle de instancias
- Settings → botones **Cargar datos demo** / **Reset demo**
- Acciones destructivas en instancias demo → simuladas (sin API cloud real)

## IPs ficticias

Solo rangos reservados para documentación (RFC 5737):

- `192.0.2.x`, `198.51.100.x`, `203.0.113.x`

## Reset manual DB

```bash
docker compose -f infra/docker-compose.yml exec postgres psql -U cloudops -d cloudops -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run prisma:migrate
npm run demo:seed
```

## Fallback automático en frontend (Fase 29)

Aunque el backend no esté disponible, el frontend Angular carga datos demo automáticamente:

| Servicio | Fallback |
|----------|----------|
| Dashboard | `buildDemoDashboard()` |
| Instances, VPS, Alerts, Billing, Audit, Notifications | `core/demo/demo-fallback.data.ts` |
| Cloud accounts | Cuentas demo por proveedor |
| Docker, K8s, Jenkins, Terraform | `InventoryService` con `catchError` |

Los loaders usan timeout de 20s y siempre cierran con `finalize()`. Ver [docs/functionality-status.md](functionality-status.md).

