# CloudOps Control Center

Plataforma unificada para gestionar **AWS**, **GCP**, **Azure**, VPS externas, Docker, Kubernetes, Jenkins, Terraform, métricas, facturación, alertas y terminal SSH desde una única interfaz.

![Stack](https://img.shields.io/badge/Angular-19-red) ![NestJS](https://img.shields.io/badge/NestJS-10-red) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

## Características

- Multi-cloud: AWS, GCP, Azure con inventario sincronizado
- VPS / bare metal con terminal SSH web (WebSocket + xterm.js)
- Detección Docker, Kubernetes, servicios systemd, puertos y métricas
- Integración Jenkins (jobs, builds, logs)
- Terraform plan/apply/destroy con confirmación
- Dashboard en tiempo real con alertas y notificaciones
- Facturación cloud estimada por proveedor y cuenta
- RBAC, auditoría y gestión segura de secretos (Vault refs)

## Arquitectura

```txt
Angular SPA  →  NestJS API  →  PostgreSQL
                    ↓              Redis
              WebSocket Gateway
              Cloud Adapters / Workers
```

Ver [docs/arquitectura.md](docs/arquitectura.md).

## Requisitos

- Node.js >= 20
- npm >= 10
- Docker & Docker Compose
- PostgreSQL 16 (incluido en Docker Compose)

## Instalación local

```bash
git clone https://github.com/YOUR_USER/cloudops-control-center.git
cd cloudops-control-center
npm install
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d
npm run prisma:migrate
npm run prisma:seed
npm run seed:demo     # dataset completo (cuentas, instancias, métricas, etc.)
npm run dev:backend   # http://localhost:3000
npm run dev:frontend  # http://localhost:4200 — reiniciar tras cambios UI (ver docs/verificacion-ui-terraform-launch.md)
```

## Modo demo

Carga **18 instancias cloud + 8 VPS** con métricas, Docker, Kubernetes, billing, alertas y más:

```bash
npm run demo:seed    # cargar dataset demo
npm run demo:reset   # limpiar y recargar
```

Ver [docs/demo-mode.md](docs/demo-mode.md). Usuario: `demo@cloudops.local` / `Demo1234!`

Activa `DEMO_MODE=true` en `.env` para mocks seguros y API `/demo/*`.

## Variables de entorno

Ver [.env.example](.env.example) y [docs/variables-entorno.md](docs/variables-entorno.md).

## Swagger API

http://localhost:3000/api/docs

## Credenciales por defecto (seed)

| Campo | Valor |
|-------|-------|
| Email | admin@cloudops.local |
| Password | Admin123! |

## Comandos útiles

```bash
npm run build          # Build all workspaces
npm run test           # Tests
npm run prisma:studio  # DB explorer
./scripts/dev-up.sh    # Docker Compose up
./scripts/migrate.sh   # Run migrations
./scripts/seed.sh      # Seed roles & admin
npm run seed:demo      # Base seed + dataset demo completo
```

## Documentación

| Doc | Descripción |
|-----|-------------|
| [API](docs/api.md) | Endpoints REST |
| [Seguridad](docs/seguridad.md) | RBAC, secretos, auditoría |
| [Terraform](docs/terraform.md) | Flujo plan/apply |
| [Jenkins](docs/jenkins.md) | Integración CI/CD |
| [SSH](docs/ssh.md) | Terminal web |
| [Billing](docs/billing.md) | Facturación cloud |
| [Despliegue local](docs/despliegue-local.md) | Docker Compose |
| [Kubernetes](docs/despliegue-kubernetes.md) | Manifests K8s |
| [Runbook](docs/runbook.md) | Operaciones |

## Despliegue Kubernetes

```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/
```

## Tests

```bash
cd apps/backend-api && npm test
cd apps/frontend-angular && npm test
./scripts/test.sh
```

## Subir a GitHub

```bash
git init
git add .
git commit -m "feat: initial CloudOps Control Center monorepo"
gh repo create cloudops-control-center --public --source=. --push
```

## Licencia

MIT — [LICENSE](LICENSE)
