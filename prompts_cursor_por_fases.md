# Prompts por fases para Cursor - CloudOps Control Center

Usa estos prompts en Cursor Agent / Composer, uno por uno.  
No lances todas las fases a la vez. Espera a que termine una fase, revisa errores y después lanza la siguiente.

---

## Fase 1 - Crear estructura base del repositorio

```md
Le adjunto captura como referencia y sube a github

Actúa como arquitecto cloud, DevOps senior y full-stack developer.

Quiero crear una aplicación llamada CloudOps Control Center en Angular + NestJS + PostgreSQL para gestionar AWS, GCP, Azure, VPS externas, Docker, Kubernetes, Jenkins, Terraform, métricas, facturación, alertas y terminal SSH desde una única interfaz.

En esta primera fase, crea únicamente la estructura base del monorepo y los archivos iniciales.

Crea esta estructura:

cloudops-control-center/
  apps/
    frontend-angular/
    backend-api/
    workers/
  packages/
    shared/
    ui/
    cloud-sdk/
  infra/
    docker/
    k8s/
    terraform/
      aws/
      gcp/
      azure/
  docs/
  scripts/
  .github/
    workflows/

Requisitos de esta fase:

1. Crear estructura de carpetas.
2. Crear README.md principal.
3. Crear .gitignore.
4. Crear .env.example.
5. Crear package.json raíz con workspaces.
6. Crear documentación inicial en docs/.
7. Preparar estructura para Angular frontend.
8. Preparar estructura para NestJS backend.
9. Preparar estructura para workers.
10. Preparar carpetas de infraestructura.
11. No implementes todavía toda la lógica.
12. Crea archivos base limpios y preparados para continuar.

No expliques demasiado. Crea los archivos directamente.
```

---

## Fase 2 - Backend NestJS base

```md
Le adjunto captura como referencia y sube a github

Ahora implementa el backend base en NestJS dentro de apps/backend-api.

Stack obligatorio:

- NestJS.
- TypeScript.
- PostgreSQL.
- Prisma.
- Redis.
- JWT.
- RBAC.
- Swagger/OpenAPI.
- ConfigModule.
- Validación con class-validator.
- Logger estructurado.

Crea los módulos:

- AuthModule.
- UsersModule.
- RolesModule.
- PermissionsModule.
- CloudAccountsModule.
- InstancesModule.
- VpsModule.
- SshModule.
- DockerDiscoveryModule.
- KubernetesDiscoveryModule.
- JenkinsModule.
- TerraformModule.
- MetricsModule.
- BillingModule.
- AlertsModule.
- NotificationsModule.
- AuditModule.
- RealtimeModule.

Requisitos:

1. Crear estructura de módulos, controladores, servicios y DTOs.
2. Crear Prisma schema inicial.
3. Crear entidades/modelos principales.
4. Crear conexión a PostgreSQL.
5. Crear conexión a Redis.
6. Crear autenticación JWT.
7. Crear RBAC básico.
8. Crear guards.
9. Crear pipes de validación.
10. Crear Swagger.
11. Crear endpoint health check.
12. Crear configuración por variables de entorno.
13. No guardar secretos en texto plano.
14. Añadir auditoría base para acciones críticas.

Crea código real y funcional, no pseudocódigo.
```

---

## Fase 3 - Modelo de base de datos PostgreSQL y migraciones

```md
Le adjunto captura como referencia y sube a github

Ahora completa el modelo de base de datos PostgreSQL usando Prisma.

Crea o mejora el archivo prisma/schema.prisma con estas tablas/modelos:

- User.
- Role.
- Permission.
- UserRole.
- Project.
- CloudAccount.
- CloudCredential.
- CloudRegion.
- Instance.
- VpsServer.
- SshKey.
- SshSession.
- CommandExecution.
- DockerHost.
- DockerContainer.
- KubernetesCluster.
- KubernetesResource.
- JenkinsServer.
- JenkinsJob.
- JenkinsBuild.
- TerraformWorkspace.
- TerraformRun.
- TerraformRunLog.
- MetricSample.
- BillingAccount.
- BillingRecord.
- AlertRule.
- Alert.
- Notification.
- AuditLog.
- InstanceTemplate.

Requisitos:

1. Relaciones correctas entre modelos.
2. IDs UUID.
3. Campos createdAt y updatedAt.
4. Soft delete donde tenga sentido.
5. Índices en campos importantes.
6. Enums para provider, instanceStatus, alertSeverity, terraformStatus, cloudProvider.
7. Campos para multi-tenant/proyecto.
8. Referencias a secretos en vez de guardar secretos directos.
9. Crear migración inicial.
10. Añadir seed básico con roles y permisos.

Crea también comandos npm para:

- prisma:generate
- prisma:migrate
- prisma:studio
- prisma:seed
```

---

## Fase 4 - Gestión de cuentas cloud e instancias

```md
Le adjunto captura como referencia y sube a github

Ahora implementa la gestión de cuentas cloud e instancias.

Proveedores:

- AWS.
- GCP.
- Azure.

Requisitos funcionales:

1. Añadir cuenta cloud.
2. Validar conexión.
3. Listar regiones.
4. Listar instancias por cuenta.
5. Ver detalle de instancia.
6. Sincronizar inventario.
7. Encender instancia.
8. Apagar instancia.
9. Reiniciar instancia.
10. Agrupar instancias por proveedor, cuenta y región.
11. Guardar auditoría.
12. No exponer secretos.

Credenciales permitidas:

- AWS IAM Role, Access Key restringida u OIDC.
- GCP Service Account.
- Azure Service Principal, Managed Identity u OIDC.

Crea adaptadores separados:

- AwsAdapterService.
- GcpAdapterService.
- AzureAdapterService.

Cada adaptador debe implementar una interfaz común llamada CloudProviderAdapter con métodos:

- validateCredentials()
- listRegions()
- listInstances()
- getInstance()
- startInstance()
- stopInstance()
- restartInstance()
- syncInventory()

Si no hay credenciales reales, implementa mocks seguros y deja TODOs claros para SDK oficial.

Crea endpoints REST, DTOs, servicios, tests básicos y documentación Swagger.
```

---

## Fase 5 - VPS externas, SSH y terminal web

```md
Le adjunto captura como referencia y sube a github

Ahora implementa el módulo de VPS externas, SSH y terminal web.

La app debe tener un apartado diferente para VPS que no sean AWS, GCP ni Azure.

Backend:

1. Crear módulo VpsModule.
2. Permitir añadir VPS por hostname/IP, puerto SSH, usuario y clave SSH.
3. Guardar claves SSH cifradas o como referencia a Secret Manager/Vault.
4. Validar conexión SSH.
5. Ejecutar comandos puntuales.
6. Abrir sesión SSH interactiva por WebSocket.
7. Registrar auditoría.
8. Bloquear o pedir confirmación para comandos peligrosos.
9. Crear CommandExecution.
10. Crear SshSession.

Frontend:

1. Crear página VPS.
2. Crear formulario para añadir VPS.
3. Crear listado de VPS.
4. Crear detalle de VPS.
5. Integrar terminal web con xterm.js.
6. Mostrar salida de comandos en tiempo real.
7. Mostrar estado de conexión.
8. Mostrar historial de comandos.

Seguridad:

- No mostrar claves privadas.
- No guardar contraseñas en texto plano.
- Validar permisos antes de ejecutar comandos.
- Evitar command injection.
```

---

## Fase 6 - Detección Docker, Kubernetes y servicios

```md
Le adjunto captura como referencia y sube a github

Ahora implementa la detección automática de Docker, Kubernetes y servicios activos en instancias y VPS.

Requisitos:

1. Crear botón "Verificar instancia".
2. Detectar sistema operativo.
3. Detectar si Docker está instalado.
4. Detectar si Docker está corriendo.
5. Listar contenedores Docker.
6. Listar imágenes Docker.
7. Listar redes Docker.
8. Listar volúmenes Docker.
9. Detectar si Kubernetes está instalado.
10. Detectar kubelet.
11. Detectar kubectl.
12. Detectar kubeconfig si existe.
13. Listar namespaces.
14. Listar pods.
15. Listar deployments.
16. Listar services.
17. Listar servicios systemd.
18. Listar puertos abiertos.
19. Listar procesos principales.
20. Medir CPU, RAM, disco y red.

Implementa:

- DockerDiscoveryService.
- KubernetesDiscoveryService.
- SystemDiscoveryService.
- DiscoveryWorker.

Guarda resultados en PostgreSQL y emite eventos en tiempo real al frontend.

Frontend:

- Mostrar pestañas: Resumen, Docker, Kubernetes, Servicios, Puertos, Procesos, Métricas.
- Mostrar estados con badges.
- Mostrar actualización en tiempo real.
```

---

## Fase 7 - Jenkins

```md
Le adjunto captura como referencia y sube a github

Ahora implementa integración con Jenkins.

Backend:

1. Crear JenkinsModule.
2. Permitir añadir servidores Jenkins.
3. Guardar URL, usuario y token de forma segura.
4. Validar conexión.
5. Listar jobs.
6. Ver detalle de job.
7. Ejecutar job.
8. Pasar parámetros.
9. Ver estado del build.
10. Ver logs en tiempo real.
11. Guardar historial en PostgreSQL.
12. Asociar builds con instancias, cuentas cloud o proyectos.
13. Crear auditoría.

Frontend:

1. Crear página Jenkins.
2. Listar servidores Jenkins.
3. Listar jobs.
4. Modal para lanzar job con parámetros.
5. Vista de build.
6. Logs en tiempo real.
7. Estado visual: queued, running, success, failed, aborted.

Seguridad:

- No mostrar tokens.
- Validar permisos antes de lanzar jobs.
- Auditar ejecuciones.
```

---

## Fase 8 - Terraform para AWS, GCP y Azure

```md
Le adjunto captura como referencia y sube a github

Ahora implementa Terraform para lanzar instancias en AWS, GCP y Azure.

Requisitos:

1. Crear TerraformModule.
2. Crear TerraformRunnerService.
3. Crear workers para terraform init, plan, apply y destroy.
4. Crear módulos Terraform para:
   - AWS EC2.
   - GCP Compute Engine.
   - Azure Virtual Machine.
5. Crear backend seguro para estado de Terraform.
6. Guardar TerraformRun y TerraformRunLog en PostgreSQL.
7. Mostrar plan antes de apply.
8. Pedir confirmación antes de apply.
9. Pedir confirmación reforzada antes de destroy.
10. Asociar recursos creados con la cuenta cloud.
11. Sincronizar inventario después de apply.
12. Auditar todas las acciones.

Frontend:

Crear popup/modal profesional para lanzar instancias con estos campos:

- Proveedor.
- Cuenta.
- Región.
- Imagen o sistema operativo.
- Tipo/tamaño de instancia.
- Nombre.
- Red.
- Security group/firewall.
- Disco.
- Tags.
- Clave SSH.
- Número de instancias.
- Estimación de coste.
- Resumen final.

Botones:

- Cancelar.
- Guardar como plantilla.
- Generar plan.
- Lanzar instancia.

El flujo debe ser:

1. Usuario rellena formulario.
2. Backend genera Terraform run.
3. Backend ejecuta terraform plan.
4. Frontend muestra plan.
5. Usuario confirma.
6. Backend ejecuta terraform apply.
7. Se sincroniza inventario.
8. Dashboard se actualiza.
```

---

## Fase 9 - Métricas, dashboard, alertas y notificaciones

```md
Le adjunto captura como referencia y sube a github

Ahora implementa métricas, dashboard en tiempo real, alertas y notificaciones.

Backend:

1. Crear MetricsModule.
2. Crear BillingModule.
3. Crear AlertsModule.
4. Crear NotificationsModule.
5. Crear RealtimeGateway con WebSockets o SSE.
6. Crear collectors para CPU, RAM, disco y red.
7. Crear workers periódicos.
8. Guardar MetricSample en PostgreSQL.
9. Crear AlertRule.
10. Crear Alert.
11. Crear Notification.
12. Emitir eventos en tiempo real.

Dashboard frontend:

Debe mostrar:

- Total de instancias.
- Instancias activas.
- Instancias apagadas.
- VPS activas.
- Docker hosts.
- Kubernetes clusters.
- Jenkins builds.
- Coste mensual estimado.
- Alertas activas.
- CPU promedio.
- RAM promedio.
- Disco usado.
- Red usada.

Gráficos requeridos:

- Gráfico de barras para consumo por proveedor.
- Gráfico circular para distribución de instancias por cloud.
- Gráfico de línea para CPU/RAM en tiempo real.
- Gráfico de barras para coste por cuenta.
- Gráfico circular para estados de instancias.

Notificaciones:

- In-app.
- Email opcional.
- Webhook opcional.

Alertas:

- CPU alta.
- RAM alta.
- Disco casi lleno.
- Coste alto.
- Instancia caída.
- Servicio crítico detenido.
- Build Jenkins fallido.
- Terraform fallido.
```

---

## Fase 10 - Facturación AWS, GCP y Azure

```md
Le adjunto captura como referencia y sube a github

Ahora implementa la facturación cloud.

Integraciones:

- AWS Cost Explorer.
- GCP Cloud Billing API.
- Azure Cost Management / Consumption API.

Requisitos:

1. Mostrar facturación por proveedor.
2. Mostrar facturación por cuenta.
3. Mostrar coste por instancia cuando sea posible.
4. Mostrar coste diario.
5. Mostrar coste semanal.
6. Mostrar coste mensual.
7. Mostrar coste por servicio.
8. Mostrar predicción de gasto.
9. Permitir configurar sincronización cada X tiempo.
10. Crear alertas por gasto alto.
11. Guardar BillingRecord en PostgreSQL.
12. Mostrar gráficos de coste.
13. Mostrar tabla filtrable de costes.
14. Emitir evento billing.updated al dashboard.

Si una API no permite coste exacto por instancia, calcula estimación basada en tipo de instancia, tiempo encendida y región, indicando que es estimado.

Crea servicios separados:

- AwsBillingService.
- GcpBillingService.
- AzureBillingService.
```

---

## Fase 11 - Frontend Angular completo

```md
Le adjunto captura como referencia y sube a github

Ahora completa el frontend Angular.

Stack:

- Angular.
- Angular Material o TailwindCSS.
- RxJS.
- Angular animations.
- Zone.js.
- xterm.js.
- Chart.js, ECharts, ApexCharts o ngx-charts.
- WebSocket/SSE.

Pantallas obligatorias:

1. Login.
2. Dashboard.
3. AWS Accounts.
4. GCP Accounts.
5. Azure Accounts.
6. VPS / Bare Metal.
7. Instances.
8. Instance Detail.
9. Terminal.
10. Docker.
11. Kubernetes.
12. Jenkins.
13. Terraform.
14. Billing.
15. Alerts.
16. Notifications.
17. Audit.
18. Settings.

Componentes:

- Sidebar.
- Topbar.
- Breadcrumbs.
- Cards de resumen.
- Tablas filtrables.
- Badges de estado.
- Modal para lanzar instancia.
- Modal para confirmar acciones peligrosas.
- Terminal xterm.js.
- Gráficos de barras.
- Gráficos circulares.
- Gráficos de línea.
- Toast notifications.
- Tema claro/oscuro.

Requisitos UX:

- Diseño profesional.
- Responsive.
- Animaciones suaves.
- Actualización en tiempo real.
- Estados loading/error/empty.
- No mostrar secretos.
- Usar logos oficiales respetando guías de marca.
```

---

## Fase 12 - Seguridad, auditoría y permisos

```md
Le adjunto captura como referencia y sube a github

Ahora refuerza seguridad, auditoría y permisos.

Implementa:

1. RBAC completo.
2. Roles:
   - Super Admin.
   - Cloud Admin.
   - DevOps.
   - Viewer.
   - Auditor.
   - Billing Viewer.
   - Jenkins Operator.
   - Terraform Operator.
3. Permisos por acción.
4. Guards por endpoint.
5. Auditoría en acciones críticas.
6. Confirmación para acciones peligrosas.
7. Confirmación reforzada para destroy/delete.
8. Rate limiting.
9. Sanitización de inputs.
10. Validación de comandos SSH.
11. Ocultación de secretos en logs.
12. Cifrado o referencia segura de secretos.
13. Expiración de sesiones.
14. Protección CORS.
15. Helmet.
16. MFA opcional preparado.
17. Separación por proyecto/tenant.
18. Tests de permisos.

Acciones críticas:

- Terraform apply.
- Terraform destroy.
- Apagar instancia.
- Reiniciar instancia.
- Eliminar instancia.
- Cambiar credenciales.
- Ejecutar comandos SSH peligrosos.
- Lanzar jobs Jenkins críticos.
```

---

## Fase 13 - Docker Compose, Kubernetes y despliegue

```md
Le adjunto captura como referencia y sube a github

Ahora añade infraestructura de despliegue.

Crea Docker Compose para desarrollo local con:

- frontend-angular.
- backend-api.
- workers.
- PostgreSQL.
- Redis.
- Jenkins.
- Vault dev.
- Prometheus.
- Grafana opcional.

Crea manifests Kubernetes:

- namespace.
- deployments.
- services.
- ingress.
- configmaps.
- secrets example.
- hpa.
- network policies básicas.
- persistent volumes si aplica.

Crea Dockerfiles para:

- frontend-angular.
- backend-api.
- workers.

Crea scripts:

- scripts/dev-up.sh
- scripts/dev-down.sh
- scripts/migrate.sh
- scripts/seed.sh
- scripts/test.sh

Crea documentación:

- docs/despliegue-local.md
- docs/despliegue-kubernetes.md
- docs/variables-entorno.md
```

---

## Fase 14 - Tests, documentación y GitHub

```md
Le adjunto captura como referencia y sube a github

Ahora finaliza el proyecto para GitHub.

Crea:

1. README.md completo.
2. docs/arquitectura.md.
3. docs/seguridad.md.
4. docs/api.md.
5. docs/terraform.md.
6. docs/jenkins.md.
7. docs/ssh.md.
8. docs/billing.md.
9. docs/runbook.md.
10. CONTRIBUTING.md.
11. LICENSE.
12. .github/workflows/ci.yml.
13. .github/workflows/docker.yml.
14. Tests unitarios backend.
15. Tests e2e básicos.
16. Tests frontend básicos.
17. Lint.
18. Formateo.
19. Validación de tipos.
20. Checklist de seguridad.

El README debe incluir:

- Descripción.
- Características.
- Arquitectura.
- Requisitos.
- Instalación local.
- Variables de entorno.
- Cómo levantar Docker Compose.
- Cómo ejecutar migraciones.
- Cómo abrir frontend.
- Cómo usar Jenkins.
- Cómo usar Terraform.
- Cómo añadir cuentas cloud.
- Cómo añadir VPS.
- Cómo ejecutar tests.
- Cómo desplegar en Kubernetes.
- Cómo subir a GitHub.

Prepara el proyecto para que pueda ejecutarse con comandos claros.
```

---

## Fase 15 - Revisión final y corrección de errores

```md
Le adjunto captura como referencia y sube a github

Haz una revisión completa del repositorio.

Objetivos:

1. Detectar archivos faltantes.
2. Detectar imports rotos.
3. Detectar errores TypeScript.
4. Detectar errores Angular.
5. Detectar errores NestJS.
6. Detectar problemas Prisma.
7. Detectar variables de entorno faltantes.
8. Detectar endpoints incompletos.
9. Detectar problemas de seguridad.
10. Detectar documentación incompleta.

Después:

1. Corrige los errores.
2. Ejecuta mentalmente el flujo principal:
   - login
   - añadir cuenta cloud
   - listar instancias
   - añadir VPS
   - conectar SSH
   - detectar Docker/Kubernetes
   - lanzar Jenkins job
   - crear instancia con Terraform plan/apply
   - ver métricas
   - ver billing
   - recibir alerta
3. Completa lo que falte.
4. Actualiza README.
5. Deja el proyecto listo para subir a GitHub.

No expliques demasiado. Aplica los cambios directamente.
```

---

# Orden recomendado

1. Fase 1 - Estructura.
2. Fase 2 - Backend base.
3. Fase 3 - Base de datos.
4. Fase 4 - Clouds.
5. Fase 5 - VPS y SSH.
6. Fase 6 - Docker/Kubernetes discovery.
7. Fase 7 - Jenkins.
8. Fase 8 - Terraform.
9. Fase 9 - Dashboard, métricas y alertas.
10. Fase 10 - Facturación.
11. Fase 11 - Frontend completo.
12. Fase 12 - Seguridad.
13. Fase 13 - Infraestructura.
14. Fase 14 - Docs, tests y GitHub.
15. Fase 15 - Revisión final.

---

# Consejo para Cursor

Cuando una fase sea muy grande y Cursor se bloquee, divide la fase en subfases.  
Por ejemplo, en vez de pedir todo Jenkins, pide primero backend Jenkins y después frontend Jenkins.

Usa frases como:

```md
Continúa desde el estado actual del repositorio y completa solo esta parte.
```

o:

```md
No rehagas archivos existentes salvo que sea necesario. Modifica solo lo imprescindible.
```
