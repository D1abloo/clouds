# Backend API

API REST y WebSocket Gateway en NestJS para CloudOps Control Center.

## Desarrollo

```bash
npm install
npm run start:dev
```

## Endpoints principales (planificados)

- `GET /health` — Health check
- `POST /auth/login` — Autenticación
- `/api/v1/*` — Recursos REST
- `/api/docs` — Swagger OpenAPI

## Módulos

Auth, Users, Roles, Permissions, CloudAccounts, Instances, Vps, Ssh, DockerDiscovery, KubernetesDiscovery, Jenkins, Terraform, Metrics, Billing, Alerts, Notifications, Audit, Realtime.
