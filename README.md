# Spendlyx / CloudOps Control Center

Plataforma unificada para gestionar **AWS**, **GCP**, **Azure**, VPS externas, Docker, Kubernetes, Jenkins, **FinOps**, **AI Infra Studio**, métricas, facturación, alertas y terminal SSH desde una única interfaz.

![Stack](https://img.shields.io/badge/Angular-19-red) ![NestJS](https://img.shields.io/badge/NestJS-10-red) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

## Características

- Multi-cloud: AWS, GCP, Azure con inventario sincronizado
- VPS / bare metal con terminal SSH web (WebSocket + xterm.js)
- Detección Docker, Kubernetes, servicios systemd, puertos y métricas
- Integración Jenkins (jobs, builds, logs)
- **FinOps** — panel de costes multi-cloud con KPIs, facturación, instancias, alertas e insights IA
- **AI Infra Studio** — asistente Copilot para lanzar instancias paso a paso (sustituye Terraform en navegación)
- Dashboard en tiempo real con alertas y notificaciones
- **Command Center** — acciones rápidas multi-plataforma
- **Deployments, Backups, Network, Storage** — infraestructura ampliada
- **Security Center, Secrets Manager, Access Control** — postura de seguridad
- **Logs, Incidents, Cost Optimizer, Reports** — observabilidad avanzada
- **Service Catalog y Approvals** — catálogo y flujos de aprobación
- **Resource Explorer** — búsqueda global de recursos
- **Topology Map** — mapa visual de infraestructura
- **Runbooks, Scheduler, Health Center** — operaciones avanzadas
- **Compliance, Capacity Planner, Change Management** — gobernanza y planificación
- **API Tokens / Webhooks, AI Assistant** — integraciones y copilot demo
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

## Módulo FinOps

Panel SaaS de gestión financiera cloud (datos mock en demo, integrable con APIs de billing en PRO).

### Rutas

| Ruta | Descripción |
|------|-------------|
| `/finops` | Hub con hero, KPIs y accesos rápidos |
| `/finops/dashboard` | Panel completo con todos los KPIs y gráficos |
| `/finops/billing` | Tabla de facturas AWS/GCP/Azure, filtros y exportación |
| `/finops/instances` | Instancias con coste, utilización y recomendaciones |
| `/finops/cost-centers` | Desglose por centro de coste y presupuesto |
| `/finops/alerts` | Alertas de presupuesto y anomalías |
| `/finops/recommendations` | Insights IA de ahorro |
| `/finops/reports` | Informes programados |
| `/finops/settings` | Umbrales, presupuestos y preferencias |

### Datos mock

Los ficheros en `apps/frontend-angular/src/app/features/finops/data/mock-*.ts` contienen facturación, instancias, alertas y recomendaciones realistas para AWS, GCP y Azure. En PRO se pueden sustituir por llamadas a `billing` y `cloud-accounts`.

### Tema

Variables SCSS en `apps/frontend-angular/src/app/features/finops/finops-theme.scss` (gradientes electric blue, purple, verde ahorro, coral sobrecoste).

## AI Infra Studio

- Ruta: `/automation/ai-infra-studio` (`/infra/ai-studio` redirige por compatibilidad)
- Las rutas `/terraform/*` redirigen aquí (los ficheros Terraform permanecen en el repo pero fuera del sidebar).
- Wizard: proveedor → región → tipo → imagen → lanzamiento real vía `CloudAccountsService` con progreso `instance.launch.progress` por WebSocket.
- **Importante:** tras un lanzamiento de prueba, elimina la instancia en el panel de instancias.

## Hora del servidor

- API: `GET /api/v1/platform/server-time` → `{ serverTime, timezone }`
- El topbar muestra la hora sincronizada cada 60 s (`ServerTimeService`).

## Documentación

| Doc | Descripción |
|-----|-------------|
| [API](docs/api.md) | Endpoints REST |
| [Seguridad](docs/seguridad.md) | RBAC, secretos, auditoría |
| [Terraform](docs/terraform.md) | Flujo plan/apply |
| [Jenkins](docs/jenkins.md) | Integración CI/CD |
| [SSH](docs/ssh.md) | Terminal web |
| [Billing](docs/billing.md) | Facturación cloud |
| [Sidebar modules](docs/sidebar-modules.md) | Navegación lateral y módulos Fase 27 |
| [Advanced modules](docs/advanced-modules.md) | Resource Explorer, Topology, Copilot, Runbooks… Fase 28 |
| [Design system](docs/design-system.md) | Tokens, borderless UI, componentes Fase 29 |
| [Functionality status](docs/functionality-status.md) | Estado de cada módulo y botones Fase 29 |
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

## Roadmap

- [ ] Conectar FinOps a billing API real (Cost Explorer, GCP Billing, Azure Cost Management)
- [ ] Presupuestos y alertas FinOps persistidos en PostgreSQL
- [ ] AI Infra Studio: plantillas guardadas y políticas de aprobación
- [ ] Exportación PDF/CSV FinOps en PRO
- [ ] SSO enterprise y multi-organización en FinOps

## Subir a GitHub

```bash
git add .
git commit -m "feat(finops): FinOps panel, AI infra studio, sidebar UX, server time sync"
git push origin pro-clean-cutover
```

Producción Spendlyx: `npm run deploy:spendlyx` (rsync + Docker rebuild en el servidor).

## Licencia

MIT — [LICENSE](LICENSE)
