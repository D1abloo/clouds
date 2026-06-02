# Datos demo — CloudOps Control Center

Todos los datos demo permiten probar la aplicación **sin conectar AWS, GCP, Azure, Jenkins ni SSH reales**.

## Cómo cargar

```bash
./scripts/seed-demo.sh
# o por separado:
./scripts/seed.sh
npm run prisma:seed:demo -w apps/backend-api
```

## Usuarios demo

| Email | Password | Rol |
|-------|----------|-----|
| admin@cloudops.local | Admin123! | super_admin |
| cloud.admin@demo.local | Demo123! | cloud_admin |
| devops@demo.local | Demo123! | devops |
| viewer@demo.local | Demo123! | viewer |
| auditor@demo.local | Demo123! | auditor |
| billing@demo.local | Demo123! | billing_viewer |
| jenkins@demo.local | Demo123! | jenkins_operator |
| terraform@demo.local | Demo123! | terraform_operator |

## Recursos demo incluidos

| Módulo | Datos |
|--------|-------|
| Cloud Accounts | 3 cuentas (AWS, GCP, Azure) con credenciales vault ref |
| Instances | 5 instancias en varios estados |
| VPS | 2 servidores bare metal |
| Docker | 1 host, 4 contenedores |
| Kubernetes | 1 cluster, 5 recursos |
| Jenkins | 1 servidor, 2 jobs, 3 builds |
| Terraform | 1 workspace, 3 runs, logs |
| Metrics | ~150 muestras CPU/RAM/disco |
| Billing | 2 cuentas, 3 registros estimados |
| Alerts | 2 alertas activas |
| Notifications | 4 notificaciones |
| Audit | 4 entradas de ejemplo |
| SSH | 3 ejecuciones de comando mock |

## Modo demo en backend

Los adaptadores cloud (`AwsAdapterService`, etc.) devuelven mocks seguros cuando no hay credenciales reales. Con datos en PostgreSQL, el frontend muestra inventario completo desde la API.

## Reset demo

```bash
docker compose -f infra/docker-compose.yml exec postgres psql -U cloudops -d cloudops -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
./scripts/migrate.sh deploy
./scripts/seed-demo.sh
```
