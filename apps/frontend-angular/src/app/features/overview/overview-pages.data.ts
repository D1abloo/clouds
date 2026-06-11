import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export interface OverviewActionRow {
  id: string
  action: string
  resource: string
  provider: string
  logo?: NavLogoKey
  region: string
  status: 'running' | 'success' | 'pending' | 'warning' | 'failed' | 'applied' | 'planning'
  actor: string
  when: string
  detail: string
}

export interface OverviewHealthRow {
  id: string
  resource: string
  type: string
  provider: string
  logo?: NavLogoKey
  issue: string
  severity: 'healthy' | 'warning' | 'critical' | 'down'
  sla: string
  lastCheck: string
  region: string
  recommendation?: string
  route?: string
  duration?: string
}

export interface OverviewProviderHealth {
  provider: string
  logo: NavLogoKey
  healthy: number
  warning: number
  critical: number
  sla: number
  resources: number
}

export interface ExplorerResourceRelation {
  id: string
  name: string
  relation: string
}

export interface ExplorerResourceEvent {
  time: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

export interface ExplorerResourceMetric {
  label: string
  value: string
  usage?: number
}

export interface ExplorerResourceRich {
  id: string
  name: string
  type: string
  typeKey: string
  provider: string
  logo?: NavLogoKey
  region: string
  status: string
  detail: string
  cost?: string
  tags?: string
  route?: string
  account?: string
  health?: 'healthy' | 'warning' | 'critical'
  lastSync?: string
  ip?: string
  uptime?: string
  cpu?: string
  risk?: 'low' | 'medium' | 'high'
  memory?: string
  disk?: string
  network?: string
  owner?: string
  team?: string
  createdAt?: string
  module?: string
  resourceArn?: string
  environment?: 'production' | 'staging' | 'development'
  syncSource?: string
  compliance?: string
  openPorts?: string
  dependencies?: ExplorerResourceRelation[]
  events?: ExplorerResourceEvent[]
  metrics?: ExplorerResourceMetric[]
  alertsActive?: number
}

const ts = (min: number): string => {
  const d = new Date(Date.now() - min * 60_000)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export const COMMAND_CENTER_ACTIONS: OverviewActionRow[] = [
  { id: '1', action: 'Reiniciar instancia', resource: 'aws-prod-app-1', provider: 'AWS', logo: 'aws', region: 'us-east-1', status: 'running', actor: 'ops@cloudops', when: ts(8), detail: 'EC2 t3.large · rolling restart' },
  { id: '2', action: 'Terraform plan', resource: 'aws-production', provider: 'Terraform', logo: 'terraform', region: 'global', status: 'applied', actor: 'dev@cloudops', when: ts(22), detail: '3 recursos · +2 ~1' },
  { id: '3', action: 'Escalar deployment', resource: 'checkout-api', provider: 'Kubernetes', logo: 'kubernetes', region: 'prod-cluster', status: 'success', actor: 'platform@cloudops', when: ts(35), detail: 'Réplicas 3 → 5' },
  { id: '4', action: 'Pipeline Jenkins', resource: 'deploy-staging', provider: 'Jenkins', logo: 'jenkins', region: 'ci-01', status: 'running', actor: 'ci@cloudops', when: ts(41), detail: 'Build #842 · stage deploy' },
  { id: '5', action: 'Iniciar contenedor', resource: 'nginx-edge', provider: 'Docker', logo: 'docker', region: 'vps-prod', status: 'success', actor: 'ops@cloudops', when: ts(55), detail: 'Puerto 443 · TLS activo' },
  { id: '6', action: 'Sync inventario GCP', resource: 'gcp-analytics', provider: 'GCP', logo: 'gcp', region: 'us-central1', status: 'pending', actor: 'system', when: ts(62), detail: '6 instancias · 2 proyectos' },
]

export const COMMAND_CENTER_PENDING: OverviewActionRow[] = [
  { id: 'p1', action: 'Detener instancia', resource: 'db-replica-02', provider: 'AWS', logo: 'aws', region: 'eu-west-1', status: 'pending', actor: 'dba@cloudops', when: 'En cola', detail: 'Requiere aprobación' },
  { id: 'p2', action: 'Terraform apply', resource: 'gcp-analytics', provider: 'Terraform', logo: 'terraform', region: 'global', status: 'planning', actor: 'dev@cloudops', when: 'ETA 4 min', detail: '12 recursos planificados' },
  { id: 'p3', action: 'Rollback deploy', resource: 'checkout-v2', provider: 'Jenkins', logo: 'jenkins', region: 'ci-01', status: 'warning', actor: 'release@cloudops', when: 'Crítico', detail: 'Versión v2.4.0 → v2.3.9' },
  { id: 'p4', action: 'Reinicio pod', resource: 'worker-crash-loop', provider: 'Kubernetes', logo: 'kubernetes', region: 'prod-cluster', status: 'pending', actor: 'sre@cloudops', when: 'ETA 1 min', detail: 'CrashLoopBackOff' },
]

export interface CommandCenterQueueItem {
  id: string
  position: number
  action: string
  resource?: string
  provider: string
  logo?: NavLogoKey
  eta: string
  status: string
  priority?: 'normal' | 'high'
  region?: string
  actionType?:
    | 'restart-instance'
    | 'scale-deployment'
    | 'terraform-plan'
    | 'jenkins-build'
    | 'vps-backup'
    | 'sync-inventory'
  namespace?: string
  replicas?: number
  jobName?: string
}

export interface CommandCenterQuickAction {
  id: string
  label: string
  icon: string
  provider: string
  logo?: NavLogoKey
  resource: string
  region: string
  detail: string
  eta: string
  /** Qué efecto tiene la acción en la infraestructura */
  effect: string
  /** Pasos que ejecuta el centro de mando */
  steps: string[]
  /** Ruta de la app donde verás el resultado */
  destinationRoute: string
  destinationLabel: string
  /** Texto corto del destino post-acción */
  destinationHint: string
  /** Tipo de acción para la API de producción */
  actionType:
    | 'restart-instance'
    | 'scale-deployment'
    | 'terraform-plan'
    | 'jenkins-build'
    | 'vps-backup'
    | 'sync-inventory'
  namespace?: string
  replicas?: number
  jobName?: string
}

export interface CommandCenterPlatformStat {
  logo: NavLogoKey
  label: string
  provider: string
  tasks: number
  successRate: number
  lastAction: string
  connected?: boolean
}

export const EMPTY_COMMAND_CENTER_PLATFORMS: CommandCenterPlatformStat[] = [
  { logo: 'aws', label: 'AWS', provider: 'AWS', tasks: 0, successRate: 100, lastAction: 'Sin actividad reciente', connected: false },
  { logo: 'gcp', label: 'GCP', provider: 'GCP', tasks: 0, successRate: 100, lastAction: 'Sin actividad reciente', connected: false },
  { logo: 'azure', label: 'Azure', provider: 'Azure', tasks: 0, successRate: 100, lastAction: 'Sin actividad reciente', connected: false },
  { logo: 'kubernetes', label: 'Kubernetes', provider: 'Kubernetes', tasks: 0, successRate: 100, lastAction: 'Sin actividad reciente', connected: false },
  { logo: 'jenkins', label: 'Jenkins', provider: 'Jenkins', tasks: 0, successRate: 100, lastAction: 'Sin actividad reciente', connected: false },
  { logo: 'terraform', label: 'Terraform', provider: 'Terraform', tasks: 0, successRate: 100, lastAction: 'Sin actividad reciente', connected: false },
  { logo: 'docker', label: 'Docker', provider: 'Docker', tasks: 0, successRate: 100, lastAction: 'Sin actividad reciente', connected: false },
]

export const COMMAND_CENTER_QUEUE: CommandCenterQueueItem[] = [
  { id: 'q1', position: 1, action: 'Sync inventario AWS', resource: 'aws-production', provider: 'AWS', logo: 'aws', eta: '2 min', status: 'pending', priority: 'normal', actionType: 'sync-inventory' },
  { id: 'q2', position: 2, action: 'Backup flota VPS', resource: 'vps-fleet', provider: 'VPS', eta: '8 min', status: 'pending', priority: 'normal', actionType: 'vps-backup', region: 'fra1' },
  { id: 'q3', position: 3, action: 'Health check K8s', resource: 'checkout-api', provider: 'Kubernetes', logo: 'kubernetes', eta: '12 min', status: 'pending', priority: 'high', actionType: 'scale-deployment', namespace: 'checkout', replicas: 5 },
  { id: 'q4', position: 4, action: 'Plan Terraform Azure', resource: 'azure-staging', provider: 'Terraform', logo: 'terraform', eta: '18 min', status: 'pending', priority: 'normal', actionType: 'terraform-plan' },
]

/** @deprecated Usar EMPTY_COMMAND_CENTER_PLATFORMS + API command-center/platforms/stats en PRO */
export const COMMAND_CENTER_PLATFORMS: CommandCenterPlatformStat[] = EMPTY_COMMAND_CENTER_PLATFORMS

export const COMMAND_CENTER_QUICK_ACTIONS: CommandCenterQuickAction[] = [
  {
    id: 'qa1',
    label: 'Reiniciar instancia',
    icon: 'restart_alt',
    provider: 'AWS',
    logo: 'aws',
    resource: '',
    region: '',
    detail: 'Reinicio en caliente de una instancia EC2 conectada',
    eta: '3 min',
    effect: 'Reinicia la instancia seleccionada sin reprovisionar: detiene servicios, reinicia el SO y valida health checks antes de devolver tráfico.',
    steps: [
      'Drena conexiones del balanceador',
      'Reinicio del SO vía API cloud',
      'Espera estado «running» + status checks OK',
    ],
    destinationRoute: '/instances/all-instances',
    destinationLabel: 'Instancias → Todas las instancias',
    destinationHint: 'Verás el estado actualizado, uptime reiniciado y logs en el detalle de la instancia.',
    actionType: 'restart-instance',
  },
  {
    id: 'qa2',
    label: 'Escalar K8s',
    icon: 'hub',
    provider: 'Kubernetes',
    logo: 'kubernetes',
    resource: '',
    region: '',
    detail: 'Escalado horizontal de un deployment',
    eta: '2 min',
    effect: 'Escala horizontalmente el deployment indicado y espera readiness de los nuevos pods.',
    steps: [
      'Patch del deployment con nuevas réplicas',
      'Programación de pods adicionales',
      'Validación readiness + HPA estable',
    ],
    destinationRoute: '/kubernetes/pods',
    destinationLabel: 'Kubernetes → Pods',
    destinationHint: 'Filtra por namespace para ver pods activos del deployment escalado.',
    actionType: 'scale-deployment',
    namespace: 'default',
    replicas: 3,
  },
  {
    id: 'qa3',
    label: 'Plan Terraform',
    icon: 'account_tree',
    provider: 'Terraform',
    logo: 'terraform',
    resource: '',
    region: 'global',
    detail: 'Dry-run de cambios en un workspace',
    eta: '5 min',
    effect: 'Ejecuta terraform plan en el workspace indicado: compara estado remoto vs código y genera un informe sin aplicar cambios.',
    steps: [
      'Init remoto + refresh del state',
      'Plan contra recursos gestionados',
      'Genera diff en el run',
    ],
    destinationRoute: '/terraform/workspaces',
    destinationLabel: 'Terraform → Workspaces',
    destinationHint: 'Abrirás el workspace con el último run de plan y diff de recursos.',
    actionType: 'terraform-plan',
  },
  {
    id: 'qa4',
    label: 'Pipeline Jenkins',
    icon: 'build',
    provider: 'Jenkins',
    logo: 'jenkins',
    resource: '',
    region: '',
    detail: 'Disparar un job de CI/CD configurado',
    eta: '8 min',
    effect: 'Dispara el pipeline Jenkins indicado: build, tests y despliegue según la configuración del job.',
    steps: [
      'Checkout del repositorio',
      'Tests y empaquetado',
      'Deploy según stages del job',
    ],
    destinationRoute: '/jenkins/jobs',
    destinationLabel: 'Jenkins → Jobs',
    destinationHint: 'Verás el job en ejecución con stages, logs en vivo y resultado del build.',
    actionType: 'jenkins-build',
    jobName: '',
  },
  {
    id: 'qa5',
    label: 'Backup VPS',
    icon: 'backup',
    provider: 'VPS',
    resource: '',
    region: '',
    detail: 'Snapshot de hosts VPS configurados',
    eta: '12 min',
    effect: 'Crea snapshots consistentes de los hosts VPS indicados (SO, volúmenes y metadatos de configuración).',
    steps: [
      'Quiesce de servicios stateful',
      'Snapshot por host',
      'Verificación de integridad + registro',
    ],
    destinationRoute: '/vps/overview',
    destinationLabel: 'VPS → Overview',
    destinationHint: 'En la flota VPS verás el timestamp del último backup y estado por host.',
    actionType: 'vps-backup',
  },
  {
    id: 'qa6',
    label: 'Sync inventario',
    icon: 'sync',
    provider: 'GCP',
    logo: 'gcp',
    resource: '',
    region: '',
    detail: 'Sincronizar inventario de una cuenta cloud',
    eta: '4 min',
    effect: 'Sincroniza el inventario cloud de la cuenta indicada: VMs, discos, redes y metadatos con la API del proveedor.',
    steps: [
      'Listado de recursos por cuenta/proyecto',
      'Mapeo de etiquetas y metadatos',
      'Actualización del índice de instancias',
    ],
    destinationRoute: '/cloud/gcp/instances',
    destinationLabel: 'Cloud → Instancias',
    destinationHint: 'Llegarás al listado actualizado con instancias, regiones y estado de sincronización.',
    actionType: 'sync-inventory',
  },
]

export type CommandCenterActionPresetGroup = { group: string; items: string[] }

export const COMMAND_CENTER_ACTION_PRESETS: CommandCenterActionPresetGroup[] = [
  { group: 'Compute', items: ['Reiniciar instancia', 'Detener instancia', 'Escalar ASG', 'Snapshot disco'] },
  { group: 'Kubernetes', items: ['Escalar deployment', 'Reinicio pod', 'Rollback deploy', 'Health check cluster'] },
  { group: 'CI/CD', items: ['Pipeline Jenkins', 'Cancelar build', 'Promover artefacto'] },
  { group: 'IaC', items: ['Plan Terraform', 'Terraform apply', 'Import recurso', 'Refresh state'] },
  { group: 'Docker', items: ['Iniciar contenedor', 'Reiniciar contenedor', 'Pull imagen'] },
]

export const HEALTH_AFFECTED: OverviewHealthRow[] = [
  { id: 'h1', resource: 'worker-crash-loop', type: 'Pod K8s', provider: 'Kubernetes', logo: 'kubernetes', issue: 'CrashLoopBackOff · OOM', severity: 'critical', sla: '99.1%', lastCheck: ts(3), region: 'prod-cluster', duration: '47 min', recommendation: 'Reiniciar pod o escalar memoria límite', route: '/kubernetes/pods' },
  { id: 'h2', resource: 'integration-tests #841', type: 'Job Jenkins', provider: 'Jenkins', logo: 'jenkins', issue: 'Build fallido · tests E2E', severity: 'critical', sla: '97.8%', lastCheck: ts(12), region: 'ci-01', duration: '12 min', recommendation: 'Re-ejecutar pipeline o revisar logs stage E2E', route: '/jenkins/jobs' },
  { id: 'h3', resource: 'aws-prod-app-3', type: 'Instancia EC2', provider: 'AWS', logo: 'aws', issue: 'CPU 92% · 12 min', severity: 'warning', sla: '99.6%', lastCheck: ts(5), region: 'us-east-1', duration: '12 min', recommendation: 'Escalar instancia o revisar procesos', route: '/instances/all-instances' },
  { id: 'h4', resource: 'snap-staging', type: 'Backup VPS', provider: 'VPS', issue: 'Último backup fallido', severity: 'critical', sla: '98.4%', lastCheck: ts(45), region: 'fra1', duration: '45 min', recommendation: 'Ejecutar backup manual desde Centro de mando', route: '/vps/overview' },
  { id: 'h5', resource: 'azure-db-5', type: 'VM Azure', provider: 'Azure', logo: 'azure', issue: 'Disco 88% utilizado', severity: 'warning', sla: '99.3%', lastCheck: ts(18), region: 'eastus', duration: '18 min', recommendation: 'Ampliar volumen o limpiar logs', route: '/cloud/azure/instances' },
  { id: 'h6', resource: 'nginx-edge', type: 'Contenedor Docker', provider: 'Docker', logo: 'docker', issue: 'Reinicio hace 2h', severity: 'warning', sla: '99.9%', lastCheck: ts(7), region: 'vps-prod', duration: '2 h', recommendation: 'Verificar healthcheck y certificados TLS', route: '/docker/containers' },
  { id: 'h7', resource: 'gcp-analytics-2', type: 'Compute GCP', provider: 'GCP', logo: 'gcp', issue: 'Latencia elevada', severity: 'warning', sla: '99.5%', lastCheck: ts(9), region: 'us-central1', duration: '9 min', recommendation: 'Revisar región y balanceo de carga', route: '/cloud/gcp/instances' },
  { id: 'h8', resource: 'terraform-staging', type: 'Workspace TF', provider: 'Terraform', logo: 'terraform', issue: 'Apply fallido · drift', severity: 'down', sla: '96.2%', lastCheck: ts(90), region: 'global', duration: '1 h 30 min', recommendation: 'Ejecutar plan y corregir drift de state', route: '/terraform/workspaces' },
]

export const HEALTH_TIMELINE = []

export const HEALTH_BY_PROVIDER: OverviewProviderHealth[] = [
  { provider: 'AWS', logo: 'aws', healthy: 48, warning: 2, critical: 0, sla: 99.7, resources: 50 },
  { provider: 'GCP', logo: 'gcp', healthy: 22, warning: 1, critical: 0, sla: 99.4, resources: 23 },
  { provider: 'Azure', logo: 'azure', healthy: 18, warning: 1, critical: 0, sla: 99.2, resources: 19 },
  { provider: 'Kubernetes', logo: 'kubernetes', healthy: 22, warning: 2, critical: 1, sla: 98.9, resources: 25 },
  { provider: 'Jenkins', logo: 'jenkins', healthy: 12, warning: 0, critical: 1, sla: 97.8, resources: 13 },
  { provider: 'Docker', logo: 'docker', healthy: 14, warning: 1, critical: 0, sla: 99.8, resources: 15 },
]

export const HEALTH_CATEGORIES = []

export const EXPLORER_RESOURCES_RICH: ExplorerResourceRich[] = [
  {
    id: 'i-001', name: 'aws-prod-app-1', type: 'Instancia EC2', typeKey: 'instance', provider: 'AWS', logo: 'aws', region: 'us-east-1', status: 'running',
    detail: 't3.large · Ubuntu 22.04 · AMI ami-0c55b159cbfafe1f0', cost: '84 US$/mes', tags: 'env:prod, team:platform, cost-center:eng',
    route: '/instances/all-instances', account: 'aws-production', health: 'healthy', lastSync: ts(4), ip: '54.23.11.45', uptime: '14 d', cpu: '34%', risk: 'low',
    memory: '8 GB', disk: '100 GB gp3', network: 'vpc-prod-main / subnet-app-a', owner: 'platform@cloudops', team: 'Platform', createdAt: '2024-11-12',
    module: 'Instancias', resourceArn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123def456', environment: 'production', syncSource: 'AWS API · inventario',
    compliance: 'SOC2 · cifrado EBS activo', openPorts: '22, 443, 8080',
    dependencies: [{ id: 'net-1', name: 'vpc-prod-main', relation: 'VPC' }, { id: 'net-2', name: 'lb-checkout-prod', relation: 'Target group' }, { id: 'acc-aws', name: 'aws-production', relation: 'Cuenta' }],
    metrics: [{ label: 'CPU', value: '34%', usage: 34 }, { label: 'Memoria', value: '5.2 / 8 GB', usage: 65 }, { label: 'Disco', value: '42%', usage: 42 }, { label: 'Red IN', value: '12 MB/s', usage: 28 }],
    events: [{ time: ts(4), message: 'Sync inventario completado', severity: 'info' }, { time: ts(120), message: 'Parche de seguridad aplicado', severity: 'info' }, { time: ts(480), message: 'Reinicio programado completado', severity: 'info' }],
    alertsActive: 0,
  },
  {
    id: 'i-002', name: 'gcp-analytics-1', type: 'Compute Engine', typeKey: 'instance', provider: 'GCP', logo: 'gcp', region: 'us-central1', status: 'running',
    detail: 'n2-standard-4 · Debian 12 · preemptible: false', cost: '156 US$/mes', tags: 'env:prod, project:analytics, workload:etl',
    route: '/cloud/gcp/instances', account: 'gcp-analytics', health: 'healthy', lastSync: ts(8), ip: '35.192.0.12', uptime: '22 d', cpu: '41%', risk: 'low',
    memory: '16 GB', disk: '256 GB SSD', network: 'analytics-vpc / subnet-etl', owner: 'data@cloudops', team: 'Data', createdAt: '2024-09-03',
    module: 'Instancias GCP', resourceArn: 'projects/analytics-prod/zones/us-central1-a/instances/gcp-analytics-1', environment: 'production', syncSource: 'GCP Compute API',
    compliance: 'GDPR · datos anonimizados', openPorts: '22, 5432',
    dependencies: [{ id: 'acc-gcp', name: 'gcp-analytics', relation: 'Proyecto' }],
    metrics: [{ label: 'CPU', value: '41%', usage: 41 }, { label: 'Memoria', value: '9.8 / 16 GB', usage: 61 }, { label: 'Disco', value: '68%', usage: 68 }],
    events: [{ time: ts(8), message: 'Inventario sincronizado', severity: 'info' }, { time: ts(60), message: 'Job ETL completado', severity: 'info' }],
    alertsActive: 0,
  },
  {
    id: 'i-003', name: 'azure-db-3', type: 'Máquina virtual', typeKey: 'instance', provider: 'Azure', logo: 'azure', region: 'eastus', status: 'running',
    detail: 'Standard_D4s_v3 · PostgreSQL 15 · réplica lectura', cost: '210 US$/mes', tags: 'env:prod, tier:db, backup:daily',
    route: '/cloud/azure/instances', account: 'azure-prod', health: 'healthy', lastSync: ts(6), ip: '20.42.8.90', uptime: '8 d', cpu: '28%', risk: 'low',
    memory: '16 GB', disk: '512 GB Premium SSD', network: 'vnet-prod / subnet-db', owner: 'dba@cloudops', team: 'Database', createdAt: '2025-01-20',
    module: 'Instancias Azure', resourceArn: '/subscriptions/abc/resourceGroups/prod/providers/Microsoft.Compute/virtualMachines/azure-db-3', environment: 'production', syncSource: 'Azure Resource Graph',
    compliance: 'PCI-DSS · backup cifrado', openPorts: '5432 (privado)',
    dependencies: [{ id: 'acc-azure', name: 'azure-prod', relation: 'Suscripción' }],
    metrics: [{ label: 'CPU', value: '28%', usage: 28 }, { label: 'Memoria', value: '11 / 16 GB', usage: 69 }, { label: 'IOPS', value: '1.2k', usage: 45 }],
    events: [{ time: ts(6), message: 'Backup diario OK', severity: 'info' }],
    alertsActive: 0,
  },
  {
    id: 'i-004', name: 'aws-prod-app-3', type: 'Instancia EC2', typeKey: 'instance', provider: 'AWS', logo: 'aws', region: 'us-east-1', status: 'warning',
    detail: 't3.xlarge · CPU sostenida > 90% · revisar autoscaling', cost: '142 US$/mes', tags: 'env:prod, team:api, autoscale:pending',
    route: '/instances/all-instances', account: 'aws-production', health: 'warning', lastSync: ts(2), ip: '54.23.11.89', uptime: '3 d', cpu: '92%', risk: 'high',
    memory: '16 GB', disk: '80 GB gp3', network: 'vpc-prod-main / subnet-app-b', owner: 'api@cloudops', team: 'API', createdAt: '2025-02-01',
    module: 'Instancias', resourceArn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0xyz789abc012', environment: 'production', syncSource: 'AWS API · CloudWatch',
    compliance: 'SOC2', openPorts: '443, 8080',
    dependencies: [{ id: 'alert-1', name: 'CPU alta aws-prod-app-3', relation: 'Alerta activa' }, { id: 'net-2', name: 'lb-checkout-prod', relation: 'Backend' }, { id: 'net-1', name: 'vpc-prod-main', relation: 'VPC' }],
    metrics: [{ label: 'CPU', value: '92%', usage: 92 }, { label: 'Memoria', value: '12 / 16 GB', usage: 75 }, { label: 'Disco', value: '55%', usage: 55 }],
    events: [{ time: ts(2), message: 'Alerta CPU > 90% disparada', severity: 'warning' }, { time: ts(5), message: 'Auto Scaling evaluando scale-out', severity: 'info' }, { time: ts(15), message: 'Umbral superado 5 min consecutivos', severity: 'critical' }],
    alertsActive: 1,
  },
  {
    id: 'vps-01', name: 'vps-monitoring-1', type: 'VPS bare metal', typeKey: 'vps', provider: 'VPS', region: 'dc-1', status: 'running',
    detail: '32 GB RAM · Docker host · Prometheus + Grafana', cost: '95 US$/mes', tags: 'role:monitoring, stack:observability',
    route: '/vps/overview', account: 'vps-fleet', health: 'healthy', lastSync: ts(15), ip: '185.12.44.2', uptime: '45 d', cpu: '18%', risk: 'low',
    memory: '32 GB', disk: '1 TB NVMe', network: 'VLAN 42 · 1 Gbps', owner: 'sre@cloudops', team: 'SRE', createdAt: '2024-06-01',
    module: 'VPS', environment: 'production', syncSource: 'Agente VPS · SSH', openPorts: '22, 9090, 3000',
    dependencies: [{ id: 'dk-nginx', name: 'nginx-edge', relation: 'Proxy reverso' }],
    metrics: [{ label: 'CPU', value: '18%', usage: 18 }, { label: 'Memoria', value: '14 / 32 GB', usage: 44 }, { label: 'Disco', value: '61%', usage: 61 }],
    events: [{ time: ts(15), message: 'Heartbeat agente OK', severity: 'info' }],
    alertsActive: 0,
  },
  {
    id: 'acc-aws', name: 'aws-production', type: 'Cuenta cloud', typeKey: 'account', provider: 'AWS', logo: 'aws', region: 'global', status: 'active',
    detail: '12 regiones · 48 recursos · 4 VPCs · IAM 126 usuarios', cost: '2.840 US$/mes', tags: 'tier:production, org:cloudops',
    route: '/cloud/aws/overview', health: 'healthy', lastSync: ts(5), risk: 'low',
    owner: 'cloud-admin@cloudops', team: 'Cloud Foundation', createdAt: '2023-01-15', module: 'Cuentas AWS', environment: 'production', syncSource: 'AWS Organizations + CUR',
    compliance: 'SOC2 · CIS Benchmark 82%', alertsActive: 2,
    dependencies: [{ id: 'i-001', name: 'aws-prod-app-1', relation: 'Instancia' }, { id: 'i-004', name: 'aws-prod-app-3', relation: 'Instancia' }, { id: 'net-1', name: 'vpc-prod-main', relation: 'Red' }],
    events: [{ time: ts(5), message: 'Sync billing CUR completado', severity: 'info' }, { time: ts(30), message: '2 alertas de coste abiertas', severity: 'warning' }],
  },
  {
    id: 'acc-gcp', name: 'gcp-analytics', type: 'Proyecto GCP', typeKey: 'account', provider: 'GCP', logo: 'gcp', region: 'global', status: 'active',
    detail: '3 proyectos · 22 VMs · BigQuery habilitado', cost: '1.120 US$/mes', tags: 'project:analytics',
    route: '/cloud/gcp/overview', health: 'healthy', lastSync: ts(10), risk: 'low',
    owner: 'data-lead@cloudops', team: 'Data', module: 'Proyectos GCP', environment: 'production', syncSource: 'GCP Asset Inventory',
    events: [{ time: ts(10), message: 'Inventario global actualizado', severity: 'info' }],
    alertsActive: 0,
  },
  {
    id: 'acc-azure', name: 'azure-prod', type: 'Suscripción Azure', typeKey: 'account', provider: 'Azure', logo: 'azure', region: 'global', status: 'active',
    detail: '2 suscripciones · 19 recursos · Policy compliant', cost: '890 US$/mes', route: '/cloud/azure/overview', health: 'healthy', lastSync: ts(12), risk: 'low',
    owner: 'azure-admin@cloudops', module: 'Suscripciones Azure', environment: 'production', syncSource: 'Azure Resource Graph',
    events: [{ time: ts(12), message: 'Policy scan sin violaciones', severity: 'info' }],
    alertsActive: 0,
  },
  {
    id: 'dk-nginx', name: 'nginx-edge', type: 'Contenedor Docker', typeKey: 'docker', provider: 'Docker', logo: 'docker', region: 'vps-prod', status: 'running',
    detail: 'nginx:1.25-alpine · TLS Let\'s Encrypt · rate limit 100r/s', cost: '—', tags: 'edge, tls, public',
    route: '/docker/containers', health: 'warning', lastSync: ts(7), uptime: '2 h', risk: 'medium', ip: '185.12.44.2',
    memory: '256 MB', disk: '2 GB overlay', network: 'bridge:edge · host vps-monitoring-1', owner: 'sre@cloudops', team: 'SRE', createdAt: '2025-02-10',
    module: 'Docker', environment: 'production', syncSource: 'Docker API', openPorts: '443, 80',
    dependencies: [{ id: 'vps-01', name: 'vps-monitoring-1', relation: 'Host' }],
    metrics: [{ label: 'CPU', value: '8%', usage: 8 }, { label: 'Memoria', value: '198 / 256 MB', usage: 77 }],
    events: [{ time: ts(7), message: 'Certificado TLS expira en 12 días', severity: 'warning' }, { time: ts(120), message: 'Contenedor reiniciado', severity: 'info' }],
    alertsActive: 1,
  },
  {
    id: 'pod-api', name: 'checkout-api-7f2k9', type: 'Pod Kubernetes', typeKey: 'kubernetes', provider: 'Kubernetes', logo: 'kubernetes', region: 'prod-cluster', status: 'running',
    detail: 'namespace: checkout · Deployment checkout-api · 512Mi limit', cost: '—', tags: 'app:checkout, version:v2.4.1',
    route: '/kubernetes/pods', account: 'prod-cluster', health: 'healthy', lastSync: ts(1), uptime: '6 d', cpu: '22%', risk: 'low',
    memory: '512 Mi', network: 'ClusterIP checkout-api:8080', owner: 'checkout@cloudops', team: 'Checkout', module: 'Kubernetes Pods',
    environment: 'production', syncSource: 'Kube API · prod-cluster',
    dependencies: [{ id: 'net-2', name: 'lb-checkout-prod', relation: 'Ingress' }],
    metrics: [{ label: 'CPU', value: '22%', usage: 22 }, { label: 'Memoria', value: '380 / 512 Mi', usage: 74 }, { label: 'Restarts', value: '0', usage: 0 }],
    events: [{ time: ts(1), message: 'Probe readiness OK', severity: 'info' }],
    alertsActive: 0,
  },
  {
    id: 'pod-fail', name: 'worker-crash-loop', type: 'Pod Kubernetes', typeKey: 'kubernetes', provider: 'Kubernetes', logo: 'kubernetes', region: 'prod-cluster', status: 'failed',
    detail: 'CrashLoopBackOff · OOMKilled · límite memoria 256Mi insuficiente', cost: '—', tags: 'app:worker, priority:high',
    route: '/kubernetes/pods', health: 'critical', lastSync: ts(3), uptime: '0', risk: 'high', memory: '256 Mi', cpu: '—',
    owner: 'platform@cloudops', team: 'Platform', module: 'Kubernetes Pods', environment: 'production', syncSource: 'Kube API',
    metrics: [{ label: 'Restarts', value: '47', usage: 100 }, { label: 'Memoria', value: '256 / 256 Mi', usage: 100 }],
    events: [{ time: ts(3), message: 'OOMKilled — límite memoria', severity: 'critical' }, { time: ts(8), message: 'CrashLoopBackOff activo', severity: 'critical' }, { time: ts(20), message: 'Escalado automático bloqueado', severity: 'warning' }],
    alertsActive: 2,
  },
  {
    id: 'job-deploy', name: 'deploy-staging', type: 'Job Jenkins', typeKey: 'jenkins', provider: 'Jenkins', logo: 'jenkins', region: 'ci-01', status: 'success',
    detail: 'Build #842 · 4m 12s · stage deploy → staging OK', cost: '—', route: '/jenkins/jobs', health: 'healthy', lastSync: ts(20), risk: 'low',
    owner: 'ci@cloudops', team: 'Release', module: 'Jenkins', environment: 'staging', syncSource: 'Jenkins REST API',
    events: [{ time: ts(20), message: 'Build #842 SUCCESS', severity: 'info' }, { time: ts(45), message: 'Artefacto publicado en registry', severity: 'info' }],
    alertsActive: 0,
  },
  {
    id: 'job-fail', name: 'integration-tests', type: 'Job Jenkins', typeKey: 'jenkins', provider: 'Jenkins', logo: 'jenkins', region: 'ci-01', status: 'failed',
    detail: 'Build #841 · tests E2E · 3 fallos en checkout flow', cost: '—', route: '/jenkins/jobs', health: 'critical', lastSync: ts(12), risk: 'high',
    owner: 'qa@cloudops', team: 'QA', module: 'Jenkins', environment: 'staging', syncSource: 'Jenkins REST API',
    events: [{ time: ts(12), message: 'Build #841 FAILED — 3 tests', severity: 'critical' }, { time: ts(18), message: 'Notificación Slack enviada', severity: 'info' }],
    alertsActive: 1,
  },
  {
    id: 'tf-run', name: 'aws-production-plan', type: 'Workspace Terraform', typeKey: 'terraform', provider: 'Terraform', logo: 'terraform', region: 'aws', status: 'applied',
    detail: 'Run #128 · 3 cambios · +2 instancias ~1 SG', cost: '—', route: '/terraform/workspaces', health: 'healthy', lastSync: ts(22), risk: 'low',
    owner: 'dev@cloudops', team: 'Platform', module: 'Terraform', environment: 'production', syncSource: 'Terraform Cloud API',
    events: [{ time: ts(22), message: 'Apply #128 completado', severity: 'info' }],
    alertsActive: 0,
  },
  {
    id: 'tf-drift', name: 'terraform-staging', type: 'Workspace Terraform', typeKey: 'terraform', provider: 'Terraform', logo: 'terraform', region: 'global', status: 'failed',
    detail: 'Apply fallido · drift detectado en 4 recursos · state lock', cost: '—', route: '/terraform/workspaces', health: 'critical', lastSync: ts(90), risk: 'high',
    owner: 'dev@cloudops', module: 'Terraform', environment: 'staging', syncSource: 'Terraform Cloud API',
    events: [{ time: ts(90), message: 'Drift detectado — 4 recursos', severity: 'critical' }, { time: ts(95), message: 'Apply abortado por policy', severity: 'warning' }],
    alertsActive: 1,
  },
  {
    id: 'alert-1', name: 'CPU alta aws-prod-app-3', type: 'Alerta', typeKey: 'alert', provider: 'AWS', logo: 'aws', region: 'us-east-1', status: 'warning',
    detail: 'Regla: CPUUtilization > 90% durante 5 min · severidad: warning', cost: '—', route: '/alerts/active', health: 'warning', lastSync: ts(5), risk: 'high',
    owner: 'sre@cloudops', module: 'Alertas', environment: 'production', syncSource: 'CloudWatch Alarms',
    dependencies: [{ id: 'i-004', name: 'aws-prod-app-3', relation: 'Recurso afectado' }],
    events: [{ time: ts(5), message: 'Alerta activa — sin ack', severity: 'warning' }],
    alertsActive: 1,
  },
  {
    id: 'net-1', name: 'vpc-prod-main', type: 'Red VPC', typeKey: 'network', provider: 'AWS', logo: 'aws', region: 'us-east-1', status: 'running',
    detail: '10.0.0.0/16 · 6 subnets · 2 NAT · flow logs activos', cost: '—', tags: 'env:prod', route: '/network', health: 'healthy', lastSync: ts(30), risk: 'low',
    owner: 'network@cloudops', module: 'Red', environment: 'production', network: 'CIDR 10.0.0.0/16',
    dependencies: [{ id: 'acc-aws', name: 'aws-production', relation: 'Cuenta' }, { id: 'i-001', name: 'aws-prod-app-1', relation: 'Instancia' }],
    events: [{ time: ts(30), message: 'Flow logs exportados a S3', severity: 'info' }],
    alertsActive: 0,
  },
  {
    id: 'net-2', name: 'lb-checkout-prod', type: 'Load Balancer', typeKey: 'network', provider: 'AWS', logo: 'aws', region: 'us-east-1', status: 'running',
    detail: 'ALB · HTTPS · 3 targets healthy · WAF asociado', cost: '38 US$/mes', route: '/network', health: 'healthy', lastSync: ts(8), risk: 'low',
    owner: 'platform@cloudops', module: 'Red', environment: 'production', network: 'internet-facing · subnet-public',
    dependencies: [{ id: 'pod-api', name: 'checkout-api-7f2k9', relation: 'Target' }, { id: 'i-004', name: 'aws-prod-app-3', relation: 'Target' }],
    metrics: [{ label: 'Requests/s', value: '1.2k', usage: 48 }, { label: 'Latencia p99', value: '89 ms', usage: 35 }, { label: '5xx', value: '0.02%', usage: 2 }],
    events: [{ time: ts(8), message: 'Health check 3/3 OK', severity: 'info' }],
    alertsActive: 0,
  },
]

export const EXPLORER_TYPE_FILTERS = []
