# Getting Started

Este directorio contiene la aplicación Angular del CloudOps Control Center.

## Desarrollo

```bash
npm install
npm run start
```

La app estará en `http://localhost:4200`.

## Estructura prevista

```txt
src/
├── app/
│   ├── core/           # Auth, guards, interceptors
│   ├── shared/         # Componentes compartidos
│   ├── features/       # Módulos por pantalla
│   └── layout/         # Sidebar, topbar
├── assets/
└── environments/
```

## Pantallas planificadas

Login, Dashboard, Cloud Accounts, VPS, Instances, Terminal, Docker, Kubernetes, Jenkins, Terraform, Billing, Alerts, Audit, Settings.
