Le adjunto captura como referencia y sube a github

# Prompt principal para la IA

Quiero que desarrolles una aplicación web profesional llamada **CloudOps Control Center** para gestionar infraestructura cloud, VPS, Docker, Kubernetes, Jenkins, Terraform, métricas, facturación y terminales SSH desde una única interfaz.

## Objetivo

Crear una plataforma centralizada que permita administrar:

- Contenedores Docker.
- Clústeres Kubernetes.
- Instancias de AWS.
- Instancias de Google Cloud Platform.
- Instancias de Microsoft Azure.
- VPS externas que no pertenezcan a AWS, GCP ni Azure.
- Ejecución de comandos por SSH.
- Detección automática de Docker, Kubernetes y servicios activos.
- Lanzamiento de tareas con Jenkins.
- Creación de infraestructura con Terraform.
- Visualización en tiempo real de rendimiento, consumo y facturación.
- Gestión multi-cuenta y multi-proveedor.

La aplicación debe estar construida con **Angular** en el frontend, usando animaciones fluidas y buenas prácticas de Angular, incluyendo Zone.js cuando sea conveniente para la detección de cambios y actualizaciones en tiempo real.

La base de datos principal debe ser **PostgreSQL**.

## Requisitos funcionales

### 1. Gestión de cuentas cloud

La app debe permitir añadir cuentas de:

- AWS.
- GCP.
- Azure.

Cada cuenta debe tener sus propias credenciales, roles, regiones, proyectos, suscripciones e instancias asociadas.

No se deben pedir contraseñas directas de las cuentas cloud. Se debe trabajar con:

- AWS IAM Role, Access Key restringida u OIDC.
- GCP Service Account con permisos mínimos.
- Azure Service Principal, Managed Identity u OIDC.
- Secretos cifrados.
- Rotación de credenciales.
- Auditoría de uso.

La app debe permitir:

- Añadir una cuenta cloud.
- Validar conexión.
- Listar regiones disponibles.
- Listar instancias existentes.
- Asociar instancias a cada cuenta.
- Ver estado de cada instancia.
- Encender, apagar, reiniciar o destruir instancias cuando el proveedor lo permita.
- Ver facturación de cada cuenta.
- Ver consumo por instancia.

### 2. Apartado independiente para VPS externas

Crear un módulo separado llamado **VPS / Bare Metal** para servidores que no sean AWS, Azure ni GCP.

Este módulo debe permitir:

- Añadir VPS por IP, hostname, puerto SSH y usuario.
- Asociar clave SSH.
- Validar conexión.
- Ejecutar comandos.
- Abrir terminal interactiva.
- Detectar sistema operativo.
- Detectar Docker instalado.
- Detectar Kubernetes instalado.
- Detectar servicios activos.
- Mostrar métricas básicas.
- Asociar etiquetas, entorno, cliente y proyecto.

### 3. Acceso por terminal

La app debe incluir terminal web integrada.

Requisitos:

- Usar xterm.js o alternativa equivalente.
- Conexión SSH segura desde backend.
- Soporte para múltiples sesiones.
- Registro opcional de auditoría.
- No guardar contraseñas en texto plano.
- Uso preferente de claves SSH cifradas.
- Permitir ejecución de comandos puntuales.
- Permitir terminal interactiva.
- Control de permisos por usuario.
- Confirmación para comandos peligrosos.

### 4. Detección automática de Docker, Kubernetes y servicios

Después de conectar una instancia, la app debe revisar automáticamente:

- Si Docker está instalado.
- Si Docker está corriendo.
- Contenedores activos.
- Imágenes existentes.
- Redes Docker.
- Volúmenes Docker.
- Si Kubernetes está instalado.
- Si kubelet está activo.
- Si existe kubeconfig.
- Pods, deployments, namespaces y services.
- Servicios del sistema usando systemd.
- Puertos abiertos.
- Procesos principales.
- Consumo de CPU, RAM, disco y red.

Debe existir un botón **Verificar instancia** y también verificaciones periódicas.

### 5. Jenkins

La app debe integrarse con Jenkins para lanzar tareas.

Requisitos:

- Añadir una o varias conexiones Jenkins.
- Guardar URL, usuario/token y credenciales de forma cifrada.
- Listar jobs disponibles.
- Lanzar jobs.
- Pasar parámetros a los jobs.
- Ver logs en tiempo real.
- Ver estado del build.
- Reintentar builds.
- Relacionar builds con instancias, cuentas cloud y despliegues.
- Mostrar historial de ejecuciones.

### 6. Terraform

La app debe permitir iniciar instancias mediante Terraform en AWS, GCP y Azure.

Requisitos:

- Crear módulo Terraform por proveedor.
- Generar plan antes de aplicar.
- Mostrar popup/modal con la infraestructura a crear.
- Solicitar confirmación del usuario antes del apply.
- Mostrar variables en UI.
- Permitir introducir datos como:
  - Proveedor.
  - Cuenta.
  - Región.
  - Tipo de instancia.
  - Sistema operativo.
  - Nombre.
  - Red/VPC/VNet.
  - Security groups/firewall.
  - Disco.
  - Tags.
  - SSH key.
  - Número de instancias.
- Ejecutar `terraform init`, `terraform plan` y `terraform apply`.
- Guardar estado de Terraform de forma segura.
- Usar backend remoto cuando sea posible.
- Auditar todas las operaciones.
- Permitir destruir recursos con confirmación reforzada.

### 7. Popup/modal para lanzamiento de instancias

Crear un popup profesional donde el usuario indique todos los datos de la instancia a lanzar.

Debe incluir:

- Selector de proveedor: AWS, GCP, Azure.
- Selector de cuenta.
- Selector de región.
- Selector de imagen/SO.
- Selector de tipo/tamaño.
- Campo de nombre.
- Campo de etiquetas.
- Campo de red.
- Campo de reglas de firewall/security group.
- Selector de clave SSH.
- Selector de disco.
- Estimación de coste.
- Resumen final.
- Botones:
  - Cancelar.
  - Generar plan.
  - Lanzar instancia.
  - Guardar como plantilla.

### 8. Dashboard en tiempo real

Crear un dashboard principal con:

- Tarjetas de resumen.
- Gráficos de barras.
- Gráficos circulares.
- Gráficos de línea para métricas.
- Estado global de clouds.
- Estado global de VPS.
- Estado de Docker.
- Estado de Kubernetes.
- Builds de Jenkins.
- Coste actual.
- Alertas activas.
- Notificaciones en tiempo real.
- Consumo por instancia.
- Consumo por cuenta.
- Facturación por proveedor.

Debe actualizarse en tiempo real usando WebSocket, Server-Sent Events o mecanismo equivalente.

### 9. Métricas y alertas

La app debe mostrar y notificar:

- CPU.
- RAM.
- Disco.
- Red.
- Número de contenedores activos.
- Número de pods activos.
- Coste estimado.
- Coste acumulado.
- Umbrales de consumo.
- Errores de conexión.
- Instancias caídas.
- Jenkins builds fallidos.
- Servicios críticos detenidos.

Debe tener:

- Notificación dentro de la app.
- Notificación por email opcional.
- Notificación por webhook opcional.
- Historial de alertas.
- Configuración de umbrales por instancia, cuenta y proveedor.

### 10. Facturación

La app debe mostrar facturación y consumo cada X tiempo.

Requisitos:

- AWS Cost Explorer.
- GCP Cloud Billing API.
- Azure Cost Management / Consumption API.
- Coste por cuenta.
- Coste por instancia.
- Coste por servicio.
- Coste diario, semanal y mensual.
- Estimación en tiempo real cuando no haya datos exactos.
- Configuración de frecuencia de sincronización.
- Alertas por gasto.

### 11. Base de datos PostgreSQL

Usar PostgreSQL como base de datos principal.

Debe almacenar:

- Usuarios.
- Roles.
- Permisos.
- Cuentas cloud.
- Credenciales cifradas o referencias a secretos.
- Instancias.
- VPS externas.
- Conexiones SSH.
- Jenkins servers.
- Jenkins jobs.
- Terraform runs.
- Métricas históricas.
- Alertas.
- Notificaciones.
- Auditoría.
- Facturación.
- Configuraciones.
- Plantillas de instancias.

### 12. UI/UX

La interfaz debe ser moderna, clara y profesional.

Requisitos:

- Angular.
- Angular Material o TailwindCSS.
- Animaciones suaves.
- Dashboard responsive.
- Modo oscuro y claro.
- Tablas filtrables.
- Búsqueda global.
- Menú lateral.
- Breadcrumbs.
- Cards de estado.
- Modales profesionales.
- Terminal integrada.
- Gráficos de barras, circulares y líneas.
- Logos originales de AWS, GCP, Azure, Docker, Kubernetes, Jenkins, Terraform y PostgreSQL, usando sus recursos oficiales y respetando sus guías de marca.

No inventar logos. Usar enlaces oficiales o assets permitidos por cada marca.

### 13. Backend recomendado

Crear backend con arquitectura modular. Se puede usar:

- NestJS con TypeScript.
- Node.js.
- PostgreSQL.
- Redis para colas, cache y eventos.
- WebSocket Gateway.
- Workers para tareas largas.
- Prisma o TypeORM.
- Vault o equivalente para secretos.
- OpenTelemetry para trazabilidad.

Servicios/módulos recomendados:

- Auth Service.
- Cloud Accounts Service.
- AWS Adapter.
- GCP Adapter.
- Azure Adapter.
- VPS Service.
- SSH Service.
- Docker Discovery Service.
- Kubernetes Discovery Service.
- Jenkins Service.
- Terraform Service.
- Metrics Service.
- Billing Service.
- Notification Service.
- Audit Service.
- Realtime Gateway.

### 14. Seguridad

La aplicación debe ser segura desde el diseño.

Implementar:

- RBAC.
- MFA opcional.
- Cifrado de secretos.
- Auditoría de acciones.
- Confirmación para acciones destructivas.
- Principio de mínimo privilegio.
- Separación por tenants/proyectos.
- Sanitización de comandos.
- Rate limiting.
- Logs seguros.
- No mostrar secretos en pantalla.
- No guardar claves privadas sin cifrar.
- Validación de permisos antes de ejecutar acciones.
- Control de sesiones SSH.
- Expiración de tokens.
- Integración con Vault, AWS Secrets Manager, GCP Secret Manager o Azure Key Vault.

### 15. Entregables esperados

Genera:

1. Monorepo con frontend Angular y backend NestJS.
2. Docker Compose para desarrollo local.
3. Manifiestos Kubernetes para despliegue.
4. Módulos Terraform para AWS, GCP y Azure.
5. Migraciones PostgreSQL.
6. Esquema de base de datos.
7. Servicios backend.
8. Componentes frontend.
9. Dashboard.
10. Terminal web.
11. Integración Jenkins.
12. Integración Terraform.
13. Integración de métricas y facturación.
14. Tests básicos.
15. README de instalación.
16. Documentación técnica.
17. Ejemplos de variables `.env.example`.

## Estructura sugerida del repositorio

```txt
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
    docker-compose.yml
    k8s/
    terraform/
      aws/
      gcp/
      azure/
  docs/
    arquitectura.md
    seguridad.md
    api.md
    despliegue.md
  scripts/
  .github/
    workflows/
  README.md
```

## Criterios de aceptación

La solución será válida si:

- Permite añadir cuentas AWS, GCP y Azure.
- Permite añadir VPS externas.
- Permite listar instancias por cuenta.
- Permite conectarse por SSH.
- Detecta Docker y Kubernetes.
- Lista servicios activos.
- Lanza jobs de Jenkins.
- Permite crear instancias con Terraform.
- Muestra modal de confirmación antes de crear infraestructura.
- Guarda datos en PostgreSQL.
- Muestra dashboard en tiempo real.
- Incluye gráficos de barras y circulares.
- Muestra métricas y costes.
- Genera notificaciones por consumo.
- Tiene arquitectura segura.
- Incluye documentación.
- Usa logos oficiales respetando guías de marca.
