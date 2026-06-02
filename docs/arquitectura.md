# Arquitectura - CloudOps Control Center

## Visión general

Plataforma de administración multi-cloud con frontend Angular, backend NestJS y PostgreSQL como fuente de verdad.

```txt
Usuario → Angular SPA → NestJS API → PostgreSQL / Redis / Vault
                              ↓
                    Cloud Adapters (AWS/GCP/Azure)
                    SSH / Docker / K8s Discovery
                    Jenkins / Terraform Runner
```

## Módulos backend

- **Auth** — JWT, sesiones, MFA preparado
- **RBAC** — Roles y permisos granulares
- **CloudAccounts** — Cuentas AWS/GCP/Azure
- **Instances** — Inventario de instancias
- **Vps / Ssh** — VPS externas y terminal web
- **Docker / Kubernetes Discovery** — Detección de servicios
- **Jenkins** — Integración CI/CD
- **Terraform** — Aprovisionamiento infra
- **Metrics / Billing / Alerts** — Observabilidad y costes

## Multi-tenant

Los recursos se agrupan por **Project** con aislamiento lógico vía RBAC.

## Eventos en tiempo real

WebSocket Gateway para métricas, logs SSH, builds Jenkins y runs Terraform.
