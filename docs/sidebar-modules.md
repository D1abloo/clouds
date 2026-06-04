# Sidebar modules — CloudOps Control Center

Referencia de la navegación lateral (Fase 27) y rutas asociadas.

## Estructura del sidebar

| Grupo | Módulos |
|-------|---------|
| **Overview** | Dashboard, Command Center |
| **Clouds** | AWS, GCP, Azure (submenús: Overview, Accounts, Instances, Network, Billing, Metrics) |
| **Infrastructure** | Instances, VPS / Bare Metal, Docker, Kubernetes, Network, Storage, Backups |
| **Automation** | Jenkins, Terraform, Deployments, Terminal, Service Catalog, Approvals |
| **Observability** | Metrics, Logs, Billing, Cost Optimizer, Alerts, Incidents, Notifications, Reports |
| **Security** | Security Center, Secrets Manager, Access Control, Audit |
| **Admin** | Users, Roles, Settings, Demo Mode |

## Módulos de plataforma (paneles completos)

Cada módulo incluye: header, summary cards, tabs, tabla demo, filtros, buscador, gráficos (si aplica), acciones con toast demo y modal de detalle.

| Módulo | Ruta | Componente |
|--------|------|------------|
| Command Center | `/command-center` | `CommandCenterComponent` |
| Deployments | `/deployments` | `DeploymentsComponent` |
| Backups | `/backups` | `BackupsComponent` |
| Security Center | `/security-center` | `SecurityCenterComponent` |
| Secrets Manager | `/secrets-manager` | `SecretsManagerComponent` |
| Logs | `/logs` | `LogsCenterComponent` |
| Incidents | `/incidents` | `IncidentsComponent` |
| Network | `/network` | `NetworkComponent` |
| Storage | `/storage` | `StorageComponent` |
| Cost Optimizer | `/cost-optimizer` | `CostOptimizerComponent` |
| Reports | `/reports` | `ReportsComponent` |
| Service Catalog | `/service-catalog` | `ServiceCatalogComponent` |
| Approvals | `/approvals` | `ApprovalsComponent` |
| Access Control | `/access-control` | `AccessControlComponent` |
| Users (Admin) | `/admin/users` | `UsersAdminComponent` |

## Shell reutilizable

- **`PlatformModulePageComponent`** — UI común (loading, error, empty, tabs, filtros, charts)
- **`platform-modules.demo.ts`** — datasets demo por módulo
- **`platform-module.models.ts`** — tipos de configuración

## Módulos existentes (enriquecidos)

| Módulo | Ruta base | Notas |
|--------|-----------|-------|
| Dashboard | `/dashboard` | Panel principal |
| Cloud hubs | `/cloud/:provider/:section` | AWS / GCP / Azure |
| Instances | `/instances/all-instances` | Lista + section-hub |
| VPS | `/vps/:section` | section-hub |
| Docker | `/docker/:section` | Página con tabs |
| Kubernetes | `/kubernetes/:section` | Página con tabs |
| Jenkins | `/jenkins/:section` | Página con tabs |
| Terraform | `/terraform/workspaces` | Editor Monaco |
| Terminal | `/terminal/:section` | SSH web |
| Billing | `/billing/:section` | Costes demo |
| Alerts | `/alerts/:section` | Alertas activas |
| Notifications | `/notifications/:section` | Bandeja |
| Audit | `/audit/:section` | Activity logs |
| Settings | `/settings/:section` | Configuración |
| Roles | `/admin/roles` | section-hub |

## Badges en sidebar (demo)

| Clave | Contador demo |
|-------|----------------|
| `alerts` | Alertas activas |
| `approvals` | 4 pendientes |
| `incidents` | 3 abiertas |
| `jenkins` | Builds fallidos |
| `command-center` | 5 tareas pendientes |
| `backups` | 2 fallidos |
| `security` | 9 recomendaciones |
| `secrets` | 5 por expirar |

## Archivos clave

```
apps/frontend-angular/src/app/
├── layout/sidebar/sidebar-tree.config.ts
├── core/routing/navigation.routes.ts
├── shared/platform/
│   ├── platform-module-page.component.ts
│   ├── platform-modules.demo.ts
│   └── platform-module.models.ts
└── features/platform-modules/platform-modules.component.ts
```

## Verificación local

```bash
npm run dev:frontend
# http://localhost:4200 — admin@cloudops.local / Admin123!
```

Tras cambios en sidebar o rutas: **Ctrl+Shift+R** en el navegador.
