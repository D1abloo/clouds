# Infraestructura técnica - CloudOps Control Center

## 1. Visión general

CloudOps Control Center es una plataforma de administración de infraestructura multi-cloud y multi-servidor.

Permite controlar AWS, GCP, Azure y VPS externas desde una app Angular conectada a un backend seguro, con PostgreSQL como base de datos principal, Terraform para aprovisionamiento, Jenkins para tareas automatizadas, terminal SSH web, métricas en tiempo real y facturación.

## 2. Arquitectura de alto nivel

```txt
Usuario
  |
  v
Angular Frontend
  |
  | REST + WebSocket/SSE
  v
API Gateway / Backend NestJS
  |
  +-- Auth & RBAC
  +-- Cloud Accounts Service
  +-- AWS Adapter
  +-- GCP Adapter
  +-- Azure Adapter
  +-- VPS Service
  +-- SSH Terminal Service
  +-- Docker Discovery Service
  +-- Kubernetes Discovery Service
  +-- Jenkins Service
  +-- Terraform Orchestrator
  +-- Metrics Collector
  +-- Billing Collector
  +-- Notification Service
  +-- Audit Service
  |
  +-- PostgreSQL
  +-- Redis
  +-- Vault / Secrets Manager
  +-- Jenkins
  +-- Terraform Runner
  +-- Prometheus opcional
```

## 3. Componentes principales

### 3.1 Frontend Angular

Responsabilidades:

- Login.
- Dashboard.
- Gestión de cuentas cloud.
- Gestión de VPS.
- Terminal web.
- Modales de creación de instancias.
- Jenkins jobs.
- Terraform plans.
- Facturación.
- Métricas.
- Notificaciones.
- Auditoría.

Librerías sugeridas:

- Angular.
- Angular Material o TailwindCSS.
- RxJS.
- Angular animations.
- Zone.js.
- xterm.js.
- ngx-charts, ECharts, Chart.js o ApexCharts.
- Socket.IO client o WebSocket nativo.

### 3.2 Backend API

Stack recomendado:

- NestJS.
- TypeScript.
- Prisma o TypeORM.
- PostgreSQL.
- Redis.
- BullMQ para jobs.
- WebSocket Gateway.
- Passport/JWT.
- OpenTelemetry.

Responsabilidades:

- API REST.
- Eventos en tiempo real.
- Gestión de sesiones.
- Control de permisos.
- Orquestación de clouds.
- Seguridad.
- Auditoría.
- Integración con Jenkins.
- Ejecución controlada de Terraform.
- Gestión de SSH.

### 3.3 Workers

Los workers ejecutan tareas largas:

- Sincronizar instancias cloud.
- Recoger métricas.
- Recoger costes.
- Revisar Docker.
- Revisar Kubernetes.
- Ejecutar Terraform plan/apply.
- Consultar Jenkins builds.
- Emitir notificaciones.
- Ejecutar discovery por SSH.

### 3.4 PostgreSQL

Base de datos principal.

Tablas recomendadas:

```txt
users
roles
permissions
user_roles
projects
cloud_accounts
cloud_credentials
cloud_regions
instances
vps_servers
ssh_keys
ssh_sessions
docker_hosts
docker_containers
kubernetes_clusters
kubernetes_resources
jenkins_servers
jenkins_jobs
jenkins_builds
terraform_workspaces
terraform_runs
terraform_run_logs
metrics_samples
billing_accounts
billing_records
alerts
alert_rules
notifications
audit_logs
service_checks
command_executions
instance_templates
```

### 3.5 Redis

Usar para:

- Colas de trabajo.
- Cache temporal.
- Pub/Sub.
- Estado de sesiones WebSocket.
- Rate limiting.

### 3.6 Vault / Secret Manager

No guardar secretos en texto plano.

Opciones:

- HashiCorp Vault.
- AWS Secrets Manager.
- GCP Secret Manager.
- Azure Key Vault.
- SOPS.
- KMS.

La base de datos debe almacenar referencias a secretos, no necesariamente el secreto completo.

## 4. Flujos principales

### 4.1 Añadir cuenta cloud

1. Usuario selecciona proveedor.
2. Introduce método de autenticación.
3. Backend valida credenciales.
4. Se guarda referencia cifrada.
5. Worker sincroniza regiones e instancias.
6. Dashboard muestra las instancias agrupadas por cuenta.

### 4.2 Añadir VPS externa

1. Usuario introduce IP/host, puerto, usuario y clave SSH.
2. Backend valida la conexión.
3. Worker ejecuta discovery.
4. Se detecta SO, Docker, Kubernetes y servicios.
5. Se guardan resultados.
6. Dashboard recibe actualización en tiempo real.

### 4.3 Ejecutar comando SSH

1. Usuario selecciona instancia.
2. Backend verifica permisos.
3. Se abre sesión SSH.
4. Frontend usa xterm.js.
5. Backend transmite entrada/salida por WebSocket.
6. Se guarda auditoría de sesión si está habilitada.

### 4.4 Crear instancia con Terraform

1. Usuario abre modal de nueva instancia.
2. Selecciona proveedor, cuenta, región y tamaño.
3. UI genera resumen.
4. Backend crea Terraform run.
5. Worker ejecuta `terraform init`.
6. Worker ejecuta `terraform plan`.
7. UI muestra el plan.
8. Usuario confirma.
9. Worker ejecuta `terraform apply`.
10. Se sincroniza la nueva instancia.
11. Dashboard se actualiza en tiempo real.

### 4.5 Facturación

1. Worker consulta APIs de coste cada X tiempo.
2. Guarda datos en `billing_records`.
3. Calcula coste por cuenta, instancia y servicio.
4. Genera alertas si supera umbrales.
5. Envía actualización al dashboard.

## 5. Seguridad

### Principios

- Mínimo privilegio.
- Zero trust entre módulos.
- Cifrado en tránsito y reposo.
- Auditoría completa.
- No exponer secretos.
- Confirmación reforzada para acciones destructivas.
- Control por roles.

### Roles recomendados

- Super Admin.
- Cloud Admin.
- DevOps.
- Viewer.
- Auditor.
- Billing Viewer.
- Jenkins Operator.
- Terraform Operator.

### Acciones sensibles

Requieren confirmación adicional:

- Destruir instancia.
- Ejecutar Terraform apply.
- Ejecutar Terraform destroy.
- Eliminar cuenta cloud.
- Cambiar credenciales.
- Ejecutar comandos peligrosos.
- Acceder a terminal root.

## 6. Métricas

Fuentes:

- AWS CloudWatch.
- GCP Cloud Monitoring.
- Azure Monitor.
- SSH agentless collector.
- Prometheus opcional.
- Docker API.
- Kubernetes Metrics API.

Métricas mínimas:

- CPU.
- RAM.
- Disco.
- Red.
- Uptime.
- Estado.
- Número de contenedores.
- Número de pods.
- Servicios activos.
- Coste estimado.

## 7. Facturación

Integraciones:

- AWS Cost Explorer.
- GCP Cloud Billing API.
- Azure Cost Management.

Datos:

- Coste diario.
- Coste mensual.
- Coste por cuenta.
- Coste por instancia.
- Coste por servicio.
- Moneda.
- Tendencia.
- Predicción estimada.

## 8. Notificaciones

Canales:

- In-app.
- Email.
- Webhook.
- Slack opcional.
- Teams opcional.

Eventos:

- Alto consumo CPU.
- Alto consumo RAM.
- Disco casi lleno.
- Coste elevado.
- Instancia caída.
- Servicio crítico detenido.
- Build Jenkins fallido.
- Terraform fallido.
- Error de SSH.

## 9. Infraestructura local de desarrollo

Servicios mínimos:

- Frontend Angular.
- Backend NestJS.
- Worker.
- PostgreSQL.
- Redis.
- Jenkins.
- Vault dev.
- Prometheus opcional.
- Grafana opcional.

## 10. Despliegue productivo

Recomendado:

- Kubernetes.
- PostgreSQL gestionado.
- Redis gestionado.
- Vault o Secret Manager.
- Ingress con TLS.
- Cert-manager.
- Horizontal Pod Autoscaler.
- Network Policies.
- Backups.
- Observabilidad con OpenTelemetry.

## 11. Módulos Terraform

Crear módulos separados:

```txt
infra/terraform/
  aws/
    instance/
    network/
    security-group/
  gcp/
    compute-instance/
    network/
    firewall/
  azure/
    virtual-machine/
    network/
    nsg/
```

Cada módulo debe exponer variables:

- name.
- region/location.
- instance_type/machine_type/vm_size.
- image.
- disk_size.
- ssh_key.
- network_id.
- tags/labels.
- count.
- startup_script opcional.

## 12. API sugerida

```txt
POST   /auth/login
GET    /cloud-accounts
POST   /cloud-accounts
POST   /cloud-accounts/:id/validate
GET    /cloud-accounts/:id/instances
GET    /instances
GET    /instances/:id
POST   /instances/:id/start
POST   /instances/:id/stop
POST   /instances/:id/restart
POST   /instances/:id/discover
POST   /instances/:id/ssh/command
WS     /instances/:id/ssh/session
GET    /metrics/dashboard
GET    /billing/summary
GET    /alerts
POST   /alerts/rules
GET    /jenkins/servers
POST   /jenkins/servers
GET    /jenkins/jobs
POST   /jenkins/jobs/:id/run
POST   /terraform/runs
POST   /terraform/runs/:id/plan
POST   /terraform/runs/:id/apply
POST   /terraform/runs/:id/destroy
```

## 13. Eventos en tiempo real

```txt
instance.status.changed
instance.metrics.updated
instance.discovery.finished
ssh.session.output
terraform.plan.started
terraform.plan.finished
terraform.apply.started
terraform.apply.finished
jenkins.build.started
jenkins.build.log
jenkins.build.finished
billing.updated
alert.created
notification.created
```

## 14. Logos originales

No incluir logos inventados.

Usar únicamente:

- Assets oficiales.
- SVG oficiales cuando la marca los permita.
- Enlaces a brand guidelines.
- Alternativa textual si no se puede redistribuir el logo.
