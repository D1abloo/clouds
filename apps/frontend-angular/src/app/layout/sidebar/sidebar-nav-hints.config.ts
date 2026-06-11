/** Texto de ayuda por ruta — visible bajo cada opción del menú lateral. */
export const SIDEBAR_NAV_HINTS: Record<string, string> = {
  '/dashboard': 'KPIs, actividad y salud de tu espacio de trabajo aislado',
  '/command-center': 'Acciones operativas con trazabilidad en tu cuenta',
  '/resource-explorer': 'Inventario live de recursos que tú conectes',
  '/topology-map': 'Mapa de relaciones entre cuentas, regiones e instancias',
  '/health-center': 'Estado de salud de instancias monitorizadas',

  '/cloud/aws/overview': 'Resumen AWS: cuentas, costes y sincronización',
  '/cloud/aws/accounts': 'Credenciales AWS cifradas (AES-256) de tu workspace',
  '/cloud/aws/instances': 'EC2 sincronizadas desde tus cuentas AWS',
  '/cloud/aws/images': 'AMIs operativas listas para lanzar con progreso en vivo',
  '/cloud/aws/network': 'VPCs y grupos de seguridad de tu inventario',
  '/cloud/aws/billing': 'Gasto MTD y desglose por servicio AWS',
  '/cloud/aws/metrics': 'Series de métricas de instancias AWS',

  '/cloud/gcp/overview': 'Resumen GCP: proyectos y estado de sync',
  '/cloud/gcp/accounts': 'Cuentas de servicio GCP almacenadas cifradas',
  '/cloud/gcp/instances': 'Compute Engine de tus proyectos GCP',
  '/cloud/gcp/images': 'Imágenes de SO operativas para Compute Engine',
  '/cloud/gcp/network': 'Redes y firewalls sincronizados',
  '/cloud/gcp/billing': 'Costes y tendencias de facturación GCP',
  '/cloud/gcp/metrics': 'Métricas de VMs y servicios GCP',

  '/cloud/azure/overview': 'Resumen Azure: suscripciones y recursos',
  '/cloud/azure/accounts': 'Service principals Azure de tu organización',
  '/cloud/azure/instances': 'Máquinas virtuales Azure sincronizadas',
  '/cloud/azure/images': 'Imágenes de marketplace operativas para VMs',
  '/cloud/azure/network': 'VNets y NSGs de tu suscripción',
  '/cloud/azure/billing': 'Gasto estimado por suscripción Azure',
  '/cloud/azure/metrics': 'Métricas de recursos Azure',

  '/cloud/clouding/overview': 'Resumen Clouding: cuentas, instancias y sync',
  '/cloud/clouding/accounts': 'Tokens API Clouding cifrados en tu workspace',
  '/cloud/clouding/instances': 'Instancias cloud sincronizadas desde Clouding',
  '/cloud/clouding/images': 'Imágenes operativas listas para lanzar en Clouding',
  '/cloud/clouding/network': 'Redes privadas y políticas de acceso',
  '/cloud/clouding/billing': 'Gasto estimado y desglose Clouding',
  '/cloud/clouding/metrics': 'Métricas de instancias Clouding',

  '/vps/digitalocean/overview': 'Resumen DigitalOcean de tu cuenta',
  '/vps/digitalocean/accounts': 'API tokens DO — solo visibles para ti',
  '/vps/digitalocean/servers': 'Droplets y servidores gestionados',
  '/vps/digitalocean/billing': 'Coste estimado DigitalOcean',
  '/vps/digitalocean/metrics': 'Métricas de servidores DO',

  '/vps/hetzner/overview': 'Resumen Hetzner Cloud',
  '/vps/hetzner/accounts': 'Tokens API Hetzner cifrados en bóveda',
  '/vps/hetzner/servers': 'Servidores cloud Hetzner',
  '/vps/hetzner/billing': 'Gasto Hetzner del periodo',
  '/vps/hetzner/metrics': 'CPU, RAM y red de tus servidores',

  '/vps/linode/overview': 'Resumen Linode / Akamai',
  '/vps/linode/accounts': 'Personal Access Tokens Linode',
  '/vps/linode/servers': 'Instancias Linode registradas',
  '/vps/linode/billing': 'Facturación Linode estimada',
  '/vps/linode/metrics': 'Métricas de instancias Linode',

  '/vps/ovh/overview': 'Resumen OVH Public Cloud',
  '/vps/ovh/accounts': 'Credenciales API OVH de tu workspace',
  '/vps/ovh/servers': 'Instancias OVH conectadas',
  '/vps/ovh/billing': 'Costes OVH del mes',
  '/vps/ovh/metrics': 'Métricas de instancias OVH',

  '/vps/ionos/overview': 'Resumen IONOS Cloud de tu cuenta',
  '/vps/ionos/accounts': 'API tokens IONOS — solo visibles para ti',
  '/vps/ionos/servers': 'Servidores cloud IONOS gestionados',
  '/vps/ionos/billing': 'Coste estimado IONOS del periodo',
  '/vps/ionos/metrics': 'CPU, RAM y red de servidores IONOS',

  '/vps/vultr/overview': 'Resumen Vultr de tu cuenta',
  '/vps/vultr/accounts': 'API keys Vultr cifradas en bóveda',
  '/vps/vultr/servers': 'Instancias cloud Vultr',
  '/vps/vultr/billing': 'Facturación Vultr estimada',
  '/vps/vultr/metrics': 'Métricas de instancias Vultr',

  '/vps/scaleway/overview': 'Resumen Scaleway de tu cuenta',
  '/vps/scaleway/accounts': 'Secret keys Scaleway IAM',
  '/vps/scaleway/servers': 'Instancias Scaleway registradas',
  '/vps/scaleway/billing': 'Costes Scaleway del mes',
  '/vps/scaleway/metrics': 'Métricas de instancias Scaleway',

  '/instances/all-instances': 'Todas las VMs cloud y VPS de tu cuenta',
  '/docker/containers': 'Contenedores en hosts descubiertos',
  '/kubernetes/pods': 'Pods y workloads de clusters conectados',
  '/network': 'Topología de red e IPs de tu inventario',
  '/storage': 'Volúmenes y discos asociados a instancias',
  '/backups': 'Copias de seguridad y snapshots programados',
  '/capacity-planner': 'Proyección de capacidad y crecimiento',

  '/jenkins/jobs': 'Jobs CI/CD de tu servidor Jenkins',
  '/terraform/workspaces': 'Workspaces IaC y ejecuciones plan/apply',
  '/deployments': 'Historial de despliegues y releases',
  '/terminal/active-sessions': 'Sesiones SSH activas en tu infra',
  '/terminal/history': 'Historial de comandos y sesiones',
  '/runbooks': 'Procedimientos operativos automatizables',
  '/runbooks/executions': 'Calendario e historial de ejecuciones',
  '/scheduler': 'Tareas programadas (cron) de tu organización',
  '/service-catalog': 'Catálogo de servicios internos',
  '/approvals': 'Solicitudes de cambio pendientes de aprobación',

  '/repositories/github': 'Repos GitHub de tu cuenta conectada',
  '/repositories/gitlab': 'Proyectos GitLab de tu cuenta conectada',
  '/repositories/github/webhooks': 'Webhooks GitHub de tus repos',
  '/repositories/github/branches': 'Ramas sincronizadas desde GitHub',
  '/repositories/github/commits': 'Historial de commits importado',
  '/repositories/github/pull-requests': 'Pull requests abiertos y cerrados',
  '/repositories/github/deployments': 'Despliegues registrados en GitHub',
  '/repositories/gitlab/webhooks': 'Webhooks GitLab de tus proyectos',
  '/repositories/gitlab/branches': 'Ramas sincronizadas desde GitLab',
  '/repositories/gitlab/commits': 'Historial de commits GitLab en vivo',
  '/repositories/gitlab/merge-requests': 'Merge requests abiertos y cerrados',
  '/repositories/gitlab/deployments': 'Pipelines y despliegues GitLab CI/CD',

  '/metrics/overview': 'Dashboards de métricas de tu stack',
  '/logs': 'Búsqueda y agregación de logs',
  '/billing/overview': 'Gasto cloud consolidado de tus cuentas',
  '/cost-optimizer': 'Recomendaciones para reducir costes',
  '/alerts/active': 'Alertas activas de tu entorno',
  '/incidents': 'Incidentes abiertos y su ciclo de vida',
  '/notifications/all': 'Bandeja de avisos del panel',
  '/reports': 'Informes exportables de operaciones',
  '/change-management': 'Cambios planificados y ventanas',

  '/security-center': 'Postura de seguridad y hallazgos',
  '/secrets-manager': 'Secretos y credenciales en bóveda cifrada',
  '/compliance': 'Políticas y evidencias de cumplimiento',
  '/access-control': 'Matriz de permisos RBAC',
  '/audit/activity-logs': 'Auditoría: quién hizo qué y cuándo',

  '/admin/users': 'Usuarios de tu organización (aislados por workspace)',
  '/admin/roles': 'Roles y permisos granulares',
  '/admin/api-tokens': 'Tokens API con alcance limitado',
  '/admin/webhooks': 'Webhooks salientes del panel',
  '/settings/general': 'Perfil, idioma y preferencias',
  '/settings/copilot': 'Clave LLM, modelo y permisos del Copilot (solo admin)',
  '/ai-assistant': 'Asistente IA para consultas operativas',
}

export const navHintForRoute = (route: string): string | undefined =>
  SIDEBAR_NAV_HINTS[route.replace(/\/$/, '')]

/** Tooltip al pasar el cursor (máx. 120 caracteres). */
export const navTooltipForRoute = (route: string): string => {
  const hint = navHintForRoute(route)
  if (!hint) return ''
  if (hint.length <= 120) return hint
  return `${hint.slice(0, 117)}…`
}
