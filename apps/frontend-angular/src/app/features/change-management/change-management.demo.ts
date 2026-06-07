export type ChangeType = 'standard' | 'normal' | 'emergency'
export type ChangeStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rejected'
export type ChangeRisk = 'critical' | 'high' | 'medium' | 'low'
export type ChangeCloud = 'aws' | 'gcp' | 'azure'

export interface ChangeTimelineEntry {
  status: ChangeStatus | string
  label: string
  at?: string
  user?: string
  note?: string
}

export interface ChangeApproval {
  role: string
  user: string
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  at?: string
}

export interface ChangeAffectedResource {
  id: string
  name: string
  type: string
  cloud: ChangeCloud
}

export interface ChangeTemplate {
  id: string
  name: string
  description: string
  type: ChangeType
  category: string
  estimatedDuration: string
  defaultRisk: ChangeRisk
  services: string[]
  steps: string[]
  scopeTemplate: string
  implementationTemplate: string
  rollbackTemplate: string
  successCriteriaTemplate: string
  requiredApprovals: string[]
}

export interface MaintenanceWindow {
  id: string
  title: string
  description: string
  start: string
  end: string
  environment: string
  owner: string
  ownerContact: string
  changesCount: number
  linkedChangeIds: string[]
  status: 'scheduled' | 'active' | 'completed'
  timezone: string
  recurrence?: string
  scope: string
  preChecks: string[]
  postChecks: string[]
  notificationChannels: string[]
  blackoutRules: string
  rollbackPolicy: string
}

export interface ChangeRequest {
  id: string
  title: string
  type: ChangeType
  status: ChangeStatus
  windowStart: string
  windowEnd: string
  service: string
  requester: string
  requesterTeam: string
  risk: ChangeRisk
  description: string
  scope: string
  implementationPlan: string
  rollbackPlan: string
  successCriteria: string
  approvals: ChangeApproval[]
  affectedResources: ChangeAffectedResource[]
  timeline: ChangeTimelineEntry[]
  createdAt: string
  completedAt?: string
  maintenanceWindowId?: string
  tags: string[]
}

const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()
const ahead = (mins: number): string => new Date(Date.now() + mins * 60_000).toISOString()
const aheadDays = (days: number, hour = 2): string => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
const aheadDaysEnd = (days: number, hour = 5): string => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

export const defaultChangeTemplates: ChangeTemplate[] = [
  {
    id: 'tpl-tf-apply',
    name: 'Terraform apply — producción',
    description: 'Aplicar cambios de infraestructura con plan previo, validación y rollback documentado.',
    type: 'standard',
    category: 'Infraestructura',
    estimatedDuration: '45–90 min',
    defaultRisk: 'high',
    services: ['terraform', 'platform-core'],
    steps: [
      'Revisar plan de Terraform',
      'Ventana de mantenimiento aprobada',
      'terraform plan + apply',
      'Validación post-apply',
    ],
    scopeTemplate: 'Módulos Terraform afectados, cuentas cloud y recursos en alcance del plan.',
    implementationTemplate: '1. Ejecutar terraform plan y adjuntar diff\n2. Aplicar en ventana aprobada\n3. Validar outputs y conectividad',
    rollbackTemplate: 'terraform apply con state anterior o revert commit + apply del tag previo.',
    successCriteriaTemplate: 'Plan aplicado sin errores; recursos en estado desired; smoke tests OK.',
    requiredApprovals: ['Tech Lead', 'CAB'],
  },
  {
    id: 'tpl-k8s-rollout',
    name: 'Rollout Kubernetes canary',
    description: 'Despliegue progresivo con análisis de métricas y rollback automático.',
    type: 'normal',
    category: 'Kubernetes',
    estimatedDuration: '30–60 min',
    defaultRisk: 'medium',
    services: ['payments-api', 'orders-api'],
    steps: [
      'Actualizar manifiestos',
      'Despliegue canary 10%',
      'Validar métricas 15 min',
      'Promoción gradual 50% → 100%',
    ],
    scopeTemplate: 'Namespace, deployment y servicios incluidos en el canary.',
    implementationTemplate: 'Actualizar imagen/tag; aplicar rollout canary; promover por fases según métricas.',
    rollbackTemplate: 'kubectl rollout undo o revertir a revisión estable documentada.',
    successCriteriaTemplate: 'Error rate estable; latencia P99 dentro de SLO; 100% tráfico en nueva revisión.',
    requiredApprovals: ['Owner servicio'],
  },
  {
    id: 'tpl-db-migration',
    name: 'Migración de base de datos',
    description: 'Migración schema con backup, ventana de mantenimiento y plan de rollback SQL.',
    type: 'standard',
    category: 'Base de datos',
    estimatedDuration: '2–4 h',
    defaultRisk: 'critical',
    services: ['db-primary', 'reporting-api'],
    steps: [
      'Snapshot pre-migración',
      'Modo mantenimiento lectura',
      'Ejecutar migración',
      'Validar integridad + smoke tests',
    ],
    scopeTemplate: 'Instancia RDS/Aurora, schemas y tablas afectadas; APIs dependientes.',
    implementationTemplate: 'Snapshot → ventana lectura → migración → validación conteos e índices.',
    rollbackTemplate: 'Restore snapshot o scripts DOWN en orden inverso documentados.',
    successCriteriaTemplate: 'Migración completa; integridad referencial; APIs operativas post-ventana.',
    requiredApprovals: ['DBA', 'CAB', 'Product Owner'],
  },
  {
    id: 'tpl-redis-patch',
    name: 'Parche Redis rolling restart',
    description: 'Reinicio rolling en cluster Redis con validación de latencia.',
    type: 'normal',
    category: 'Cache',
    estimatedDuration: '20–40 min',
    defaultRisk: 'medium',
    services: ['session-store', 'rate-limiter'],
    steps: [
      'Verificar réplicas activas',
      'Reinicio nodo a nodo',
      'Monitorizar latencia P99',
    ],
    scopeTemplate: 'Cluster Redis, nodos primario/réplica y clientes críticos.',
    implementationTemplate: 'Failover controlado nodo a nodo con verificación de replicación.',
    rollbackTemplate: 'Revertir versión binaria o restaurar snapshot RDB si aplica.',
    successCriteriaTemplate: 'Cluster healthy; latencia P99 < umbral; sin pérdida de sesiones críticas.',
    requiredApprovals: ['SRE on-call'],
  },
  {
    id: 'tpl-emergency-hotfix',
    name: 'Hotfix de emergencia',
    description: 'Despliegue acelerado fuera de ventana con aprobación mínima y post-mortem obligatorio.',
    type: 'emergency',
    category: 'Aplicación',
    estimatedDuration: '15–30 min',
    defaultRisk: 'critical',
    services: ['api-gateway', 'auth-service'],
    steps: [
      'Aprobación CAB de emergencia',
      'Deploy directo a prod',
      'Smoke tests críticos',
      'Post-mortem en 24h',
    ],
    scopeTemplate: 'Servicio afectado, commit/tag del hotfix y blast radius documentado.',
    implementationTemplate: 'Deploy pipeline expedited; validación mínima en prod; monitorización reforzada 2h.',
    rollbackTemplate: 'Revert deploy inmediato al artefacto N-1 verificado.',
    successCriteriaTemplate: 'Incidente mitigado; métricas de error normalizadas; post-mortem programado.',
    requiredApprovals: ['Incident Commander', 'Engineering Manager'],
  },
  {
    id: 'tpl-waf-update',
    name: 'Actualización reglas WAF',
    description: 'Cambio de reglas WAF/CloudFront con prueba en staging previa.',
    type: 'standard',
    category: 'Seguridad',
    estimatedDuration: '30 min',
    defaultRisk: 'high',
    services: ['cdn-edge', 'api-gateway'],
    steps: [
      'Validar reglas en staging',
      'Aplicar en producción',
      'Monitorizar bloqueos 403/429',
    ],
    scopeTemplate: 'Web ACL, reglas asociadas y distribuciones CloudFront afectadas.',
    implementationTemplate: 'Publicar reglas en staging → pruebas → propagación prod con monitorización.',
    rollbackTemplate: 'Restaurar versión anterior de Web ACL desde backup de configuración.',
    successCriteriaTemplate: 'Sin incremento anómalo de 403; tráfico legítimo sin bloqueos; reglas activas.',
    requiredApprovals: ['Security', 'Platform'],
  },
]

export const defaultMaintenanceWindows: MaintenanceWindow[] = [
  {
    id: 'mw-101',
    title: 'Ventana semanal — producción core',
    description: 'Ventana estándar para cambios de infraestructura, Terraform y despliegues tier-1 en producción.',
    start: aheadDays(1, 2),
    end: aheadDaysEnd(1, 5),
    environment: 'Producción',
    owner: 'SRE Team',
    ownerContact: 'sre@cloudops.io · Slack #sre-oncall',
    changesCount: 4,
    linkedChangeIds: ['CHG-4901', 'CHG-4902'],
    status: 'scheduled',
    timezone: 'Europe/Madrid (UTC+2)',
    recurrence: 'Semanal · domingo 02:00–05:00',
    scope: 'Cuentas AWS prod-main, GCP prod-gke, servicios tier-1 (checkout, payments, auth)',
    preChecks: [
      'Confirmar 0 incidentes P1 abiertos',
      'Error budget disponible > 20 %',
      'Backups de BD verificados en las últimas 24 h',
      'CAB pre-aprobado para RFCs vinculados',
    ],
    postChecks: [
      'Smoke tests tier-1 en verde',
      'Métricas RED estables 30 min',
      'Cierre automático de alertas de ventana',
    ],
    notificationChannels: ['Slack #changes-prod', 'Email cab@cloudops.io', 'PagerDuty schedule SRE'],
    blackoutRules: 'No cambios de emergencia sin aprobación VP Eng. Freeze en Black Friday y fin de mes contable.',
    rollbackPolicy: 'Todo RFC debe incluir plan de rollback probado en staging. Rollback automático si error rate > 1 % durante 5 min.',
  },
  {
    id: 'mw-102',
    title: 'Mantenimiento DB — réplica primaria',
    description: 'Ventana exclusiva para migraciones, parches y mantenimiento de bases de datos PostgreSQL en producción.',
    start: aheadDays(3, 1),
    end: aheadDaysEnd(3, 4),
    environment: 'Producción',
    owner: 'DBA Team',
    ownerContact: 'dba@cloudops.io · Slack #dba-oncall',
    changesCount: 1,
    linkedChangeIds: ['CHG-4903'],
    status: 'scheduled',
    timezone: 'Europe/Madrid (UTC+2)',
    scope: 'RDS db-primary-prod · réplicas de lectura · jobs ETL dependientes',
    preChecks: [
      'Snapshot RDS completado y verificado',
      'Réplica lag < 5 s',
      'Modo mantenimiento comunicado a Product',
    ],
    postChecks: [
      'REINDEX y ANALYZE completados',
      'Consultas reporting P95 < 2 s',
      'Réplica lag < 30 s',
    ],
    notificationChannels: ['Slack #dba', 'Email data@cloudops.io'],
    blackoutRules: 'Solo un cambio DB crítico por ventana. No solapar con MW-101.',
    rollbackPolicy: 'Restauración desde snapshot pre-migración (RPO 5 min). Escalar a DBA Lead si rollback > 45 min.',
  },
  {
    id: 'mw-103',
    title: 'Ventana staging — despliegues',
    description: 'Ventana nocturna para despliegues continuos y pruebas de integración en staging.',
    start: aheadDays(0, 22),
    end: aheadDaysEnd(1, 1),
    environment: 'Staging',
    owner: 'Platform Engineering',
    ownerContact: 'platform@cloudops.io',
    changesCount: 6,
    linkedChangeIds: ['CHG-4890'],
    status: 'active',
    timezone: 'Europe/Madrid (UTC+2)',
    recurrence: 'Diaria · 22:00–01:00',
    scope: 'Todos los namespaces staging · Jenkins · Terraform workspaces non-prod',
    preChecks: ['Pipeline CI en verde', 'No deploys prod en curso'],
    postChecks: ['Health checks staging OK', 'Logs sin errores críticos'],
    notificationChannels: ['Slack #staging-deploys'],
    blackoutRules: 'Cambios libres sin CAB. Emergencias prod excluidas.',
    rollbackPolicy: 'Rollback vía Argo CD / Jenkins previous build.',
  },
  {
    id: 'mw-104',
    title: 'Parche seguridad — cluster K8s',
    description: 'Ventana para upgrades de control plane, node pools y parches CVE en clusters de producción.',
    start: aheadDays(5, 3),
    end: aheadDaysEnd(5, 6),
    environment: 'Producción',
    owner: 'Cloud Native',
    ownerContact: 'cloud-native@cloudops.io',
    changesCount: 2,
    linkedChangeIds: [],
    status: 'scheduled',
    timezone: 'Europe/Madrid (UTC+2)',
    scope: 'EKS prod-us-east · GKE prod-eu · AKS prod-westeu',
    preChecks: [
      'CVE score >= 7.0 documentado',
      'Surge node pool preparado',
      'Runbook k8s-upgrade revisado',
    ],
    postChecks: [
      'Todos los nodos en versión target',
      '0 pods Pending',
      'Security scan post-parche OK',
    ],
    notificationChannels: ['Slack #cloud-native', 'Email security@cloudops.io'],
    blackoutRules: 'Requiere aprobación Security + SRE. Máximo 2 clusters por ventana.',
    rollbackPolicy: 'Revertir node pool a imagen anterior. Mantener surge pool 24 h post-ventana.',
  },
]

export const defaultChangeRequests: ChangeRequest[] = [
  {
    id: 'CHG-4901',
    title: 'Terraform apply — VPC hub-spoke pagos',
    type: 'standard',
    status: 'pending_approval',
    windowStart: aheadDays(1, 2),
    windowEnd: aheadDaysEnd(1, 5),
    service: 'platform-core',
    requester: 'platform@cloudops.io',
    requesterTeam: 'Platform Engineering',
    risk: 'high',
    description: 'Despliegue de nueva VPC hub-spoke para workload de pagos con NAT y endpoints privados.',
    scope: 'Proyecto AWS pagos-prod · módulo vpc-hub-spoke · 3 AZ · subnets públicas/privadas · NAT GW',
    implementationPlan:
      '1. terraform plan en workspace aws-payments-vpc\n2. Revisión de diff con arquitectura\n3. terraform apply durante ventana MW-101\n4. Validar conectividad desde bastion y endpoints S3/DynamoDB',
    rollbackPlan:
      'terraform destroy -target=module.vpc (solo si no hay dependencias)\nRestaurar rutas desde snapshot Terraform state v2024.06.01\nEscalar a CAB si hay tráfico activo',
    successCriteria:
      'VPC creada con CIDR 10.48.0.0/16 · endpoints privados responden · sin alertas de conectividad en 30 min',
    approvals: [
      { role: 'Arquitectura', user: 'arch@cloudops.io', status: 'pending' },
      { role: 'Security', user: 'security@cloudops.io', status: 'pending' },
      { role: 'FinOps', user: 'finops@cloudops.io', status: 'approved', at: ago(120) },
    ],
    affectedResources: [
      { id: 'ws-tf-aws-payments', name: 'aws-payments-vpc', type: 'Terraform workspace', cloud: 'aws' },
      { id: 'rtb-payments-main', name: 'payments-main-rtb', type: 'Route table', cloud: 'aws' },
    ],
    timeline: [
      { status: 'draft', label: 'Borrador creado', at: ago(480), user: 'platform@cloudops.io' },
      { status: 'pending_approval', label: 'Enviado a CAB', at: ago(240), user: 'platform@cloudops.io' },
    ],
    createdAt: ago(480),
    maintenanceWindowId: 'mw-101',
    tags: ['terraform', 'network', 'payments'],
  },
  {
    id: 'CHG-4902',
    title: 'Rollout canary — payments-api v2.14',
    type: 'normal',
    status: 'scheduled',
    windowStart: aheadDays(2, 10),
    windowEnd: aheadDaysEnd(2, 12),
    service: 'payments-api',
    requester: 'release@cloudops.io',
    requesterTeam: 'Payments Squad',
    risk: 'medium',
    description: 'Despliegue canary de payments-api v2.14 con nuevas reglas de fraude y métricas OpenTelemetry.',
    scope: 'Namespace payments-prod · Deployment payments-api · HPA y ServiceMonitor',
    implementationPlan:
      '1. Actualizar imagen a v2.14.0 en manifiesto canary\n2. Argo Rollouts: 10% → 50% → 100%\n3. Validar latencia P99 < 180ms y error rate < 0.1%\n4. Promover stable',
    rollbackPlan:
      'argocd app rollback payments-api --revision prev\nRevertir imagen a v2.13.2\nEscalar réplicas stable a capacidad previa',
    successCriteria: '100% tráfico en stable · 0 errores 5xx en 30 min · dashboards OTel operativos',
    approvals: [
      { role: 'Tech Lead', user: 'lead@cloudops.io', status: 'approved', at: ago(600) },
      { role: 'SRE', user: 'sre@cloudops.io', status: 'approved', at: ago(540) },
    ],
    affectedResources: [
      { id: 'dep-payments-api', name: 'payments-api', type: 'Deployment', cloud: 'aws' },
      { id: 'svc-payments', name: 'payments-svc', type: 'Service', cloud: 'aws' },
    ],
    timeline: [
      { status: 'draft', label: 'RFC creado', at: ago(960), user: 'release@cloudops.io' },
      { status: 'approved', label: 'Aprobado por CAB', at: ago(540), user: 'sre@cloudops.io' },
      { status: 'scheduled', label: 'Programado en ventana', at: ago(480), user: 'scheduler@cloudops.io' },
    ],
    createdAt: ago(960),
    maintenanceWindowId: 'mw-101',
    tags: ['kubernetes', 'canary', 'payments'],
  },
  {
    id: 'CHG-4903',
    title: 'Migración schema — tabla orders_partition',
    type: 'standard',
    status: 'in_progress',
    windowStart: ago(30),
    windowEnd: ahead(90),
    service: 'db-primary',
    requester: 'dba@cloudops.io',
    requesterTeam: 'DBA',
    risk: 'critical',
    description: 'Particionado de tabla orders para optimizar consultas de reporting Q2.',
    scope: 'RDS PostgreSQL db-primary-prod · schema public · tabla orders (~840M filas)',
    implementationPlan:
      '1. pg_dump lógico pre-migración\n2. CREATE TABLE orders_partitioned\n3. INSERT SELECT por lotes de 10M\n4. Swap de nombres con lock mínimo\n5. REINDEX y ANALYZE',
    rollbackPlan:
      'Restaurar desde snapshot RDS pre-migración (RPO 5 min)\nRevertir alias de tabla a orders_legacy\nActivar modo degradado reporting',
    successCriteria: 'Consultas reporting < 2s P95 · 0 deadlocks · réplica lag < 30s',
    approvals: [
      { role: 'DBA Lead', user: 'dba-lead@cloudops.io', status: 'approved', at: ago(1440) },
      { role: 'Product Owner', user: 'po-orders@cloudops.io', status: 'approved', at: ago(1380) },
      { role: 'On-call SRE', user: 'oncall@cloudops.io', status: 'approved', at: ago(60) },
    ],
    affectedResources: [
      { id: 'rds-db-primary', name: 'db-primary-prod', type: 'RDS PostgreSQL', cloud: 'aws' },
      { id: 'rep-db-read', name: 'db-replica-read', type: 'Read replica', cloud: 'aws' },
    ],
    timeline: [
      { status: 'draft', label: 'RFC creado', at: ago(2880), user: 'dba@cloudops.io' },
      { status: 'approved', label: 'Aprobado CAB', at: ago(1380), user: 'dba-lead@cloudops.io' },
      { status: 'scheduled', label: 'Ventana MW-102', at: ago(120), user: 'scheduler@cloudops.io' },
      { status: 'in_progress', label: 'Migración en curso — lote 4/9', at: ago(25), user: 'dba@cloudops.io', note: 'Progreso 44%' },
    ],
    createdAt: ago(2880),
    maintenanceWindowId: 'mw-102',
    tags: ['database', 'migration', 'production'],
  },
  {
    id: 'CHG-4904',
    title: 'Hotfix — auth-service token validation',
    type: 'emergency',
    status: 'pending_approval',
    windowStart: ahead(15),
    windowEnd: ahead(75),
    service: 'auth-service',
    requester: 'oncall@cloudops.io',
    requesterTeam: 'SRE',
    risk: 'critical',
    description: 'Corrección de validación JWT tras incidente INC-9941 — tokens expirados aceptados en edge.',
    scope: 'Deployment auth-service · ConfigMap jwt-validation · Ingress api-gateway',
    implementationPlan:
      '1. Build v1.8.3-hotfix desde rama hotfix/INC-9941\n2. Deploy directo prod (bypass canary)\n3. Purga cache CDN /auth/*\n4. Smoke tests login + refresh token',
    rollbackPlan: 'Revertir a imagen v1.8.2\nRestaurar ConfigMap anterior\nPurgar CDN nuevamente',
    successCriteria: '0 tokens expirados aceptados en 15 min · INC-9941 resuelto · login OK',
    approvals: [
      { role: 'On-call SRE', user: 'oncall@cloudops.io', status: 'approved', at: ago(8) },
      { role: 'Security', user: 'security@cloudops.io', status: 'pending' },
    ],
    affectedResources: [
      { id: 'dep-auth', name: 'auth-service', type: 'Deployment', cloud: 'gcp' },
      { id: 'ing-api-gw', name: 'api-gateway', type: 'Ingress', cloud: 'gcp' },
    ],
    timeline: [
      { status: 'draft', label: 'RFC emergencia', at: ago(20), user: 'oncall@cloudops.io', note: 'Vinculado INC-9941' },
      { status: 'pending_approval', label: 'Aprobación expedita', at: ago(12), user: 'oncall@cloudops.io' },
    ],
    createdAt: ago(20),
    tags: ['emergency', 'security', 'incident'],
  },
  {
    id: 'CHG-4895',
    title: 'BigQuery datasets — pipeline analytics Q2',
    type: 'normal',
    status: 'approved',
    windowStart: aheadDays(4, 9),
    windowEnd: aheadDaysEnd(4, 11),
    service: 'etl-nightly',
    requester: 'data@cloudops.io',
    requesterTeam: 'Data Platform',
    risk: 'medium',
    description: 'Creación de datasets BigQuery y IAM para pipeline analytics Q2.',
    scope: 'Proyecto gcp-analytics · 3 datasets · service accounts ETL',
    implementationPlan:
      'terraform apply workspace gcp-analytics\nCrear datasets raw, curated, mart\nAsignar roles bigquery.dataEditor a SA etl-runner',
    rollbackPlan: 'terraform destroy datasets nuevos\nRevocar IAM bindings añadidos',
    successCriteria: 'Datasets accesibles desde etl-nightly · permisos IAM auditados · coste <$100/mes',
    approvals: [
      { role: 'FinOps', user: 'finops@cloudops.io', status: 'approved', at: ago(720) },
      { role: 'Data Lead', user: 'data-lead@cloudops.io', status: 'approved', at: ago(680) },
    ],
    affectedResources: [
      { id: 'ws-tf-gcp-analytics', name: 'gcp-analytics', type: 'Terraform workspace', cloud: 'gcp' },
      { id: 'bq-raw', name: 'analytics_raw', type: 'BigQuery dataset', cloud: 'gcp' },
    ],
    timeline: [
      { status: 'draft', label: 'RFC creado', at: ago(1200), user: 'data@cloudops.io' },
      { status: 'approved', label: 'Aprobado', at: ago(680), user: 'data-lead@cloudops.io' },
    ],
    createdAt: ago(1200),
    tags: ['gcp', 'analytics', 'terraform'],
  },
  {
    id: 'CHG-4890',
    title: 'Redis rolling restart — parche memoria',
    type: 'normal',
    status: 'draft',
    windowStart: aheadDays(6, 23),
    windowEnd: aheadDaysEnd(7, 1),
    service: 'session-store',
    requester: 'sre@cloudops.io',
    requesterTeam: 'SRE',
    risk: 'medium',
    description: 'Aplicar parche de memoria en cluster Redis staging antes de replicar en prod.',
    scope: 'ElastiCache redis-staging · 3 nodos · reinicio rolling',
    implementationPlan: 'Ejecutar runbook rb-redis-rolling-restart\nReinicio nodo a nodo\nValidar latencia y hit rate',
    rollbackPlan: 'Restaurar snapshot ElastiCache pre-parche\nRevertir parameter group',
    successCriteria: 'Latencia P99 < 5ms · hit rate > 95% · 0 failover no planificado',
    approvals: [{ role: 'SRE Lead', user: 'sre-lead@cloudops.io', status: 'pending' }],
    affectedResources: [
      { id: 'ec-redis-stg', name: 'redis-staging', type: 'ElastiCache', cloud: 'aws' },
    ],
    timeline: [{ status: 'draft', label: 'Borrador', at: ago(60), user: 'sre@cloudops.io' }],
    createdAt: ago(60),
    maintenanceWindowId: 'mw-103',
    tags: ['redis', 'maintenance', 'staging'],
  },
  {
    id: 'CHG-4880',
    title: 'AKS node pool upgrade — 1.29',
    type: 'standard',
    status: 'completed',
    windowStart: ago(4320),
    windowEnd: ago(4140),
    service: 'k8s-prod-aks',
    requester: 'cloud-native@cloudops.io',
    requesterTeam: 'Cloud Native',
    risk: 'high',
    description: 'Upgrade del node pool de producción AKS de 1.28 a 1.29 con surge nodes.',
    scope: 'AKS cluster prod-aks · node pool system · 6 nodos',
    implementationPlan: 'Crear surge node pool\nCordon + drain nodos legacy\nUpgrade control plane\nValidar workloads críticos',
    rollbackPlan: 'Revertir node pool a imagen 1.28\nEscalar surge pool a 0',
    successCriteria: 'Todos los nodos en 1.29 · 0 pods Pending · métricas estables 1h',
    approvals: [
      { role: 'Cloud Native Lead', user: 'cn-lead@cloudops.io', status: 'approved', at: ago(5000) },
      { role: 'SRE', user: 'sre@cloudops.io', status: 'approved', at: ago(4900) },
    ],
    affectedResources: [
      { id: 'aks-prod', name: 'prod-aks', type: 'AKS cluster', cloud: 'azure' },
      { id: 'np-system', name: 'system-pool', type: 'Node pool', cloud: 'azure' },
    ],
    timeline: [
      { status: 'draft', label: 'RFC creado', at: ago(7200), user: 'cloud-native@cloudops.io' },
      { status: 'approved', label: 'Aprobado', at: ago(4900), user: 'sre@cloudops.io' },
      { status: 'scheduled', label: 'Programado', at: ago(4500), user: 'scheduler@cloudops.io' },
      { status: 'in_progress', label: 'Upgrade iniciado', at: ago(4320), user: 'cloud-native@cloudops.io' },
      { status: 'completed', label: 'Completado sin incidencias', at: ago(4140), user: 'cloud-native@cloudops.io' },
    ],
    createdAt: ago(7200),
    completedAt: ago(4140),
    tags: ['azure', 'kubernetes', 'upgrade'],
  },
  {
    id: 'CHG-4875',
    title: 'Eliminación bucket S3 legacy backups',
    type: 'normal',
    status: 'rejected',
    windowStart: ago(8640),
    windowEnd: ago(8460),
    service: 'finops-cleanup',
    requester: 'cost@cloudops.io',
    requesterTeam: 'FinOps',
    risk: 'high',
    description: 'Retirada de bucket S3 legacy sin acceso en 12 meses.',
    scope: 'Bucket s3-legacy-backups-2019 · región us-east-1',
    implementationPlan: 'Verificar lifecycle policies\nEmpty bucket\nDelete bucket',
    rollbackPlan: 'Restaurar desde Glacier si retención activa',
    successCriteria: 'Bucket eliminado · ahorro $12/mes confirmado',
    approvals: [
      { role: 'FinOps', user: 'finops@cloudops.io', status: 'approved', at: ago(8700) },
      { role: 'Legal/Compliance', user: 'compliance@cloudops.io', status: 'rejected', at: ago(8640) },
    ],
    affectedResources: [
      { id: 's3-legacy', name: 's3-legacy-backups-2019', type: 'S3 bucket', cloud: 'aws' },
    ],
    timeline: [
      { status: 'draft', label: 'RFC creado', at: ago(9000), user: 'cost@cloudops.io' },
      { status: 'pending_approval', label: 'En revisión', at: ago(8800), user: 'cost@cloudops.io' },
      { status: 'rejected', label: 'Rechazado — retención legal', at: ago(8640), user: 'compliance@cloudops.io' },
    ],
    createdAt: ago(9000),
    completedAt: ago(8640),
    tags: ['s3', 'cost', 'compliance'],
  },
  {
    id: 'CHG-4870',
    title: 'WAF rules update — OWASP CRS 4.0',
    type: 'standard',
    status: 'completed',
    windowStart: ago(2880),
    windowEnd: ago(2760),
    service: 'cdn-edge',
    requester: 'security@cloudops.io',
    requesterTeam: 'Security',
    risk: 'high',
    description: 'Actualización de reglas WAF a OWASP CRS 4.0 en CloudFront y ALB.',
    scope: 'WAF web-acl-prod · CloudFront distribution E1ABC · ALB api-prod',
    implementationPlan: 'Validar reglas en staging 24h\nAplicar web-acl v4\nMonitorizar falsos positivos',
    rollbackPlan: 'Revertir a web-acl v3.2\nWhitelist temporal si bloqueos legítimos',
    successCriteria: '0 falsos positivos críticos · bloqueos OWASP activos · latencia sin degradación',
    approvals: [
      { role: 'Security Lead', user: 'sec-lead@cloudops.io', status: 'approved', at: ago(3200) },
      { role: 'SRE', user: 'sre@cloudops.io', status: 'approved', at: ago(3100) },
    ],
    affectedResources: [
      { id: 'waf-prod', name: 'web-acl-prod', type: 'WAF ACL', cloud: 'aws' },
      { id: 'cf-main', name: 'cdn-main', type: 'CloudFront', cloud: 'aws' },
    ],
    timeline: [
      { status: 'draft', label: 'RFC creado', at: ago(4000), user: 'security@cloudops.io' },
      { status: 'approved', label: 'Aprobado', at: ago(3100), user: 'sre@cloudops.io' },
      { status: 'completed', label: 'Completado', at: ago(2760), user: 'security@cloudops.io' },
    ],
    createdAt: ago(4000),
    completedAt: ago(2760),
    tags: ['security', 'waf', 'production'],
  },
  {
    id: 'CHG-4865',
    title: 'Jenkins credentials rotation — prod pipelines',
    type: 'normal',
    status: 'cancelled',
    windowStart: ago(5760),
    windowEnd: ago(5580),
    service: 'ci-cd-prod',
    requester: 'devops@cloudops.io',
    requesterTeam: 'DevOps',
    risk: 'medium',
    description: 'Rotación trimestral de credenciales Jenkins para pipelines de producción.',
    scope: 'Jenkins prod · credenciales API deploy · 12 pipelines afectados',
    implementationPlan: 'Generar nuevas credenciales\nActualizar Jenkins credential store\nNotificar owners de pipelines\nValidar builds',
    rollbackPlan: 'Restaurar credenciales anteriores desde vault backup',
    successCriteria: '12 pipelines verdes post-rotación · 0 builds fallidos por auth',
    approvals: [{ role: 'Security', user: 'security@cloudops.io', status: 'approved', at: ago(6000) }],
    affectedResources: [
      { id: 'jenkins-prod', name: 'jenkins-prod', type: 'Jenkins', cloud: 'aws' },
    ],
    timeline: [
      { status: 'draft', label: 'RFC creado', at: ago(6500), user: 'devops@cloudops.io' },
      { status: 'approved', label: 'Aprobado', at: ago(6000), user: 'security@cloudops.io' },
      { status: 'cancelled', label: 'Cancelado — ventana reprogramada', at: ago(5700), user: 'devops@cloudops.io' },
    ],
    createdAt: ago(6500),
    completedAt: ago(5700),
    tags: ['jenkins', 'secrets', 'cancelled'],
  },
]

export const defaultChangeRequestsSnapshot = (): ChangeRequest[] =>
  structuredClone(defaultChangeRequests)

export const defaultMaintenanceWindowsSnapshot = (): MaintenanceWindow[] =>
  structuredClone(defaultMaintenanceWindows)

export const defaultChangeTemplatesSnapshot = (): ChangeTemplate[] =>
  structuredClone(defaultChangeTemplates)

export const getLinkedChangesForWindow = (
  windowId: string,
  changes: ChangeRequest[],
): ChangeRequest[] => changes.filter((c) => c.maintenanceWindowId === windowId)

export const getActiveLinkedChangesForWindow = (
  windowId: string,
  changes: ChangeRequest[],
): ChangeRequest[] =>
  getLinkedChangesForWindow(windowId, changes).filter((c) =>
    ['draft', 'pending_approval', 'approved', 'scheduled', 'in_progress'].includes(c.status),
  )

export const computeChangeDuration = (change: ChangeRequest): string | null => {
  const endMs = change.completedAt
    ? new Date(change.completedAt).getTime()
    : new Date(change.windowEnd).getTime()
  const startMs = new Date(change.windowStart).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null

  const totalMins = Math.round((endMs - startMs) / 60_000)
  if (totalMins < 60) return `${totalMins} min`

  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`
}
