import type { ServiceCatalogCategory } from '../service-catalog/service-catalog.types'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'delegated'
export type ApprovalRisk = 'critical' | 'high' | 'medium' | 'low'
export type ApprovalSource = 'terraform' | 'service-catalog' | 'runbooks' | 'jenkins' | 'instances'
export type ApprovalCloud = 'aws' | 'gcp' | 'azure'
export type ApprovalEnvironment = 'production' | 'staging' | 'development'

export type ApprovalActionType =
  | 'terraform_apply'
  | 'terraform_destroy'
  | 'instance_stop'
  | 'instance_delete'
  | 'volume_delete'
  | 'template_launch'
  | 'runbook_execute'
  | 'secret_rotate'

export interface ApprovalComment {
  author: string
  at: string
  text: string
}

export interface ApprovalStep {
  role: string
  user: string
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  at?: string
}

export interface ApprovalImpact {
  costDelta?: string
  downtime?: string
  affectedServices: string[]
  blastRadius: string
}

export type ApprovalPendingExecution =
  | {
      kind: 'service-catalog-launch'
      templateId: string
      templateName: string
      templateVersion: string
      cloud: ApprovalCloud
      category: ServiceCatalogCategory
      options: {
        environment: ApprovalEnvironment
        parameters: string
        note: string
        dryRun: boolean
        notifyOnComplete: boolean
      }
      requester: string
    }
  | {
      kind: 'runbook-execute'
      runbookId: string
      runbookName: string
      execute: {
        runbookId: string
        instanceId: string
        target: string
        provider: string
        accountName?: string
        dryRun: boolean
        notifyOnComplete: boolean
        note?: string
      }
      requester: string
    }

export interface ApprovalRequest {
  id: string
  action: string
  actionType: ApprovalActionType
  source: ApprovalSource
  resource: string
  resourceId: string
  cloud: ApprovalCloud
  environment: ApprovalEnvironment
  requester: string
  requesterTeam: string
  risk: ApprovalRisk
  status: ApprovalStatus
  requestedAt: string
  slaDeadline: string
  slaMinutes: number
  changeTicket?: string
  justification: string
  /** Acción concreta que se autoriza al pulsar Aprobar */
  approvedSubject: string
  /** Qué ocurrirá en la plataforma tras la aprobación */
  onApproveEffect: string
  sourceEntityId: string
  sourceEntityLabel: string
  impact: ApprovalImpact
  approversRequired: number
  approversCompleted: number
  approvalChain: ApprovalStep[]
  payload?: string
  pendingExecution?: ApprovalPendingExecution
  comments: ApprovalComment[]
  decidedAt?: string
  decidedBy?: string
  decisionNote?: string
  tags: string[]
}

export interface ApprovalPolicy {
  id: string
  name: string
  description: string
  scope: string
  minApprovers: number
  riskThreshold: ApprovalRisk
  environments: ApprovalEnvironment[]
  sources: ApprovalSource[]
  enabled: boolean
  lastTriggered?: string
  pendingCount: number
}

const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()
const ahead = (mins: number): string => new Date(Date.now() + mins * 60_000).toISOString()

export const defaultApprovalRequests: ApprovalRequest[] = [
  {
    id: 'apr-2401',
    action: 'Terraform destroy — VPC staging',
    actionType: 'terraform_destroy',
    source: 'terraform',
    resource: 'aws-staging-vpc',
    resourceId: 'ws-tf-aws-staging-vpc',
    cloud: 'aws',
    environment: 'staging',
    requester: 'dev@cloudops.io',
    requesterTeam: 'Platform Engineering',
    risk: 'critical',
    status: 'pending',
    requestedAt: ago(42),
    slaDeadline: ahead(18),
    slaMinutes: 60,
    changeTicket: 'CHG-4821',
    justification: 'Retirada del entorno staging tras migración a nueva VPC hub-spoke. Recursos huérfanos verificados.',
    approvedSubject: 'Destruir workspace Terraform «aws-staging-vpc» y sus 12 recursos',
    onApproveEffect: 'Se ejecutará terraform destroy — la VPC staging dejará de existir.',
    sourceEntityId: 'ws-tf-aws-staging-vpc',
    sourceEntityLabel: 'aws-staging-vpc',
    impact: {
      costDelta: '-$420/mes',
      downtime: 'Ninguno (staging)',
      affectedServices: ['api-staging', 'worker-staging', 'redis-staging'],
      blastRadius: 'VPC completa · 12 recursos',
    },
    approversRequired: 2,
    approversCompleted: 0,
    approvalChain: [
      { role: 'Tech Lead', user: 'lead@cloudops.io', status: 'pending' },
      { role: 'Security', user: 'security@cloudops.io', status: 'pending' },
    ],
    payload: 'terraform destroy -target=module.vpc\nworkspace=aws-staging-vpc\nauto_approve=false',
    comments: [
      { author: 'dev@cloudops.io', at: ago(42), text: 'Migración completada en CHG-4810. Listo para destrucción.' },
    ],
    tags: ['terraform', 'staging', 'cleanup'],
  },
  {
    id: 'apr-2402',
    action: 'Detener instancia producción',
    actionType: 'instance_stop',
    source: 'instances',
    resource: 'db-primary-prod',
    resourceId: 'i-0a8f3c2e91b4d7f01',
    cloud: 'aws',
    environment: 'production',
    requester: 'ops@cloudops.io',
    requesterTeam: 'SRE',
    risk: 'critical',
    status: 'pending',
    requestedAt: ago(18),
    slaDeadline: ahead(42),
    slaMinutes: 60,
    changeTicket: 'INC-9923',
    justification: 'Mantenimiento de emergencia del volumen EBS adjunto. Stop controlado antes de snapshot.',
    approvedSubject: 'Detener instancia EC2 «db-primary-prod» (i-0a8f3c2e91b4d7f01)',
    onApproveEffect: 'Se detendrá la instancia de base de datos primaria en producción (~15 min downtime).',
    sourceEntityId: 'i-0a8f3c2e91b4d7f01',
    sourceEntityLabel: 'db-primary-prod',
    impact: {
      costDelta: '—',
      downtime: '~15 min estimados',
      affectedServices: ['billing-api', 'orders-api', 'reporting'],
      blastRadius: 'Base de datos primaria · réplica en lectura activa',
    },
    approversRequired: 2,
    approversCompleted: 1,
    approvalChain: [
      { role: 'On-call SRE', user: 'oncall@cloudops.io', status: 'approved', at: ago(12) },
      { role: 'DBA Lead', user: 'dba@cloudops.io', status: 'pending' },
    ],
    payload: 'action=stop\ninstance_id=i-0a8f3c2e91b4d7f01\nforce=false',
    comments: [
      { author: 'ops@cloudops.io', at: ago(18), text: 'Incidente INC-9923 — latencia EBS > 50ms.' },
      { author: 'oncall@cloudops.io', at: ago(12), text: 'Revisado failover. Aprobado stop controlado.' },
    ],
    tags: ['production', 'database', 'incident'],
  },
  {
    id: 'apr-2403',
    action: 'Terraform apply — analytics GCP',
    actionType: 'terraform_apply',
    source: 'terraform',
    resource: 'gcp-analytics',
    resourceId: 'ws-tf-gcp-analytics',
    cloud: 'gcp',
    environment: 'production',
    requester: 'infra@cloudops.io',
    requesterTeam: 'Data Platform',
    risk: 'high',
    status: 'pending',
    requestedAt: ago(95),
    slaDeadline: ahead(5),
    slaMinutes: 120,
    changeTicket: 'CHG-4835',
    justification: 'Despliegue de BigQuery datasets y IAM para pipeline de analytics Q2.',
    approvedSubject: 'Aplicar cambios Terraform en workspace «gcp-analytics» (producción)',
    onApproveEffect: 'Se ejecutará terraform apply — 3 datasets BigQuery + IAM (+$95/mes).',
    sourceEntityId: 'ws-tf-gcp-analytics',
    sourceEntityLabel: 'gcp-analytics',
    impact: {
      costDelta: '+$95/mes',
      downtime: 'Ninguno',
      affectedServices: ['etl-nightly', 'looker-embed'],
      blastRadius: 'Proyecto gcp-analytics · IAM + 3 datasets',
    },
    approversRequired: 1,
    approversCompleted: 0,
    approvalChain: [{ role: 'FinOps', user: 'finops@cloudops.io', status: 'pending' }],
    payload: 'terraform apply\nworkspace=gcp-analytics\nvar.environment=production',
    comments: [],
    tags: ['gcp', 'analytics', 'finops'],
  },
  {
    id: 'apr-2404',
    action: 'Eliminar volumen huérfano',
    actionType: 'volume_delete',
    source: 'instances',
    resource: 'vol-orphan-001',
    resourceId: 'vol-0f9e2a1b8c3d4e5f6',
    cloud: 'aws',
    environment: 'development',
    requester: 'cost@cloudops.io',
    requesterTeam: 'FinOps',
    risk: 'medium',
    status: 'pending',
    requestedAt: ago(210),
    slaDeadline: ago(30),
    slaMinutes: 180,
    changeTicket: 'FIN-118',
    justification: 'Volumen sin adjuntar desde hace 45 días. Ahorro estimado $38/mes.',
    approvedSubject: 'Eliminar volumen EBS huérfano «vol-orphan-001»',
    onApproveEffect: 'Se borrará el volumen permanentemente — ahorro $38/mes.',
    sourceEntityId: 'vol-0f9e2a1b8c3d4e5f6',
    sourceEntityLabel: 'vol-orphan-001',
    impact: {
      costDelta: '-$38/mes',
      downtime: 'Ninguno',
      affectedServices: [],
      blastRadius: 'Volumen aislado · sin snapshots recientes',
    },
    approversRequired: 1,
    approversCompleted: 0,
    approvalChain: [{ role: 'Platform Admin', user: 'admin@cloudops.io', status: 'pending' }],
    payload: 'volume_id=vol-0f9e2a1b8c3d4e5f6\nforce=true',
    comments: [
      { author: 'cost@cloudops.io', at: ago(210), text: 'Verificado en inventario — sin adjunto ni tags críticos.' },
    ],
    tags: ['cost-optimization', 'orphan'],
  },
  {
    id: 'apr-2405',
    action: 'Lanzar plantilla VPC hub-spoke',
    actionType: 'template_launch',
    source: 'service-catalog',
    resource: 'tpl-4 · Módulo Terraform VPC hub-spoke',
    resourceId: 'launch-sc-8842',
    cloud: 'aws',
    environment: 'production',
    requester: 'platform@cloudops.io',
    requesterTeam: 'Cloud Native',
    risk: 'high',
    status: 'pending',
    requestedAt: ago(8),
    slaDeadline: ahead(52),
    slaMinutes: 60,
    changeTicket: 'CHG-4840',
    justification: 'Nueva landing zone para workload de pagos. Parámetros revisados con arquitectura.',
    approvedSubject: 'Lanzar plantilla «Módulo Terraform VPC hub-spoke» (v1.4.2) en Producción',
    onApproveEffect: 'Se aprovisionará una nueva VPC AWS (CIDR 10.0.0.0/16, 3 AZ, NAT) — +$95/mes.',
    sourceEntityId: 'tpl-4',
    sourceEntityLabel: 'Módulo Terraform VPC hub-spoke',
    impact: {
      costDelta: '+$95/mes',
      downtime: 'Ninguno (greenfield)',
      affectedServices: ['payments-gateway (futuro)'],
      blastRadius: 'Nueva VPC · sin impacto en redes existentes',
    },
    approversRequired: 2,
    approversCompleted: 0,
    approvalChain: [
      { role: 'Arquitectura', user: 'arch@cloudops.io', status: 'pending' },
      { role: 'Security', user: 'security@cloudops.io', status: 'pending' },
    ],
    payload: 'CIDR=10.0.0.0/16\nAZ_COUNT=3\nENABLE_NAT=true\nenvironment=production',
    comments: [],
    tags: ['service-catalog', 'network', 'production'],
  },
  {
    id: 'apr-2406',
    action: 'Ejecutar runbook — reinicio cache Redis',
    actionType: 'runbook_execute',
    source: 'runbooks',
    resource: 'rb-redis-rolling-restart',
    resourceId: 'rb-ex-7712',
    cloud: 'aws',
    environment: 'staging',
    requester: 'sre@cloudops.io',
    requesterTeam: 'SRE',
    risk: 'medium',
    status: 'pending',
    requestedAt: ago(25),
    slaDeadline: ahead(35),
    slaMinutes: 60,
    changeTicket: 'CHG-4838',
    justification: 'Aplicar parche de memoria en cluster Redis staging antes de ventana prod.',
    approvedSubject: 'Ejecutar runbook «rb-redis-rolling-restart» en redis-staging',
    onApproveEffect: 'Se ejecutarán los pasos de reinicio rolling en el cluster Redis staging.',
    sourceEntityId: 'rb-redis-rolling-restart',
    sourceEntityLabel: 'rb-redis-rolling-restart',
    impact: {
      costDelta: '—',
      downtime: '< 2 min por nodo',
      affectedServices: ['session-store', 'rate-limiter'],
      blastRadius: 'Cluster redis-staging · 3 nodos',
    },
    approversRequired: 1,
    approversCompleted: 0,
    approvalChain: [{ role: 'SRE Lead', user: 'sre-lead@cloudops.io', status: 'pending' }],
    payload: 'runbook=rb-redis-rolling-restart\ntarget=redis-staging\nconcurrency=1',
    comments: [],
    tags: ['runbook', 'redis', 'maintenance'],
  },
  {
    id: 'apr-2390',
    action: 'Terraform apply prod',
    actionType: 'terraform_apply',
    source: 'terraform',
    resource: 'aws-prod-core',
    resourceId: 'ws-tf-aws-prod-core',
    cloud: 'aws',
    environment: 'production',
    requester: 'infra@cloudops.io',
    requesterTeam: 'Platform Engineering',
    risk: 'high',
    status: 'approved',
    requestedAt: ago(3600),
    slaDeadline: ago(3480),
    slaMinutes: 120,
    changeTicket: 'CHG-4812',
    justification: 'Actualización de security groups para WAF.',
    approvedSubject: 'Aplicar cambios Terraform en workspace «aws-prod-core» (producción)',
    onApproveEffect: 'Se actualizarán security groups y reglas WAF en VPC prod-core.',
    sourceEntityId: 'ws-tf-aws-prod-core',
    sourceEntityLabel: 'aws-prod-core',
    impact: {
      costDelta: '—',
      downtime: 'Ninguno',
      affectedServices: ['api-gateway', 'cdn-edge'],
      blastRadius: 'SGs en VPC prod-core',
    },
    approversRequired: 2,
    approversCompleted: 2,
    approvalChain: [
      { role: 'Tech Lead', user: 'lead@cloudops.io', status: 'approved', at: ago(3580) },
      { role: 'Security', user: 'security@cloudops.io', status: 'approved', at: ago(3550) },
    ],
    payload: 'terraform apply\nworkspace=aws-prod-core',
    comments: [
      { author: 'security@cloudops.io', at: ago(3550), text: 'Reglas WAF alineadas con política SEC-12.' },
    ],
    decidedAt: ago(3550),
    decidedBy: 'security@cloudops.io',
    decisionNote: 'Aprobado — cambio dentro de ventana de mantenimiento.',
    tags: ['terraform', 'security'],
  },
  {
    id: 'apr-2388',
    action: 'Eliminar bucket S3',
    actionType: 'volume_delete',
    source: 'instances',
    resource: 's3-legacy-backups',
    resourceId: 's3-legacy-backups-2019',
    cloud: 'aws',
    environment: 'production',
    requester: 'cost@cloudops.io',
    requesterTeam: 'FinOps',
    risk: 'critical',
    status: 'rejected',
    requestedAt: ago(7200),
    slaDeadline: ago(7020),
    slaMinutes: 180,
    changeTicket: 'FIN-102',
    justification: 'Bucket legacy sin acceso en 12 meses.',
    approvedSubject: 'Eliminar bucket S3 «s3-legacy-backups-2019»',
    onApproveEffect: 'Se eliminará el bucket y su contenido (sujeto a retención legal).',
    sourceEntityId: 's3-legacy-backups-2019',
    sourceEntityLabel: 's3-legacy-backups',
    impact: {
      costDelta: '-$12/mes',
      downtime: 'Ninguno',
      affectedServices: [],
      blastRadius: 'Bucket S3 · posibles retenciones legales',
    },
    approversRequired: 2,
    approversCompleted: 1,
    approvalChain: [
      { role: 'FinOps', user: 'finops@cloudops.io', status: 'approved', at: ago(7150) },
      { role: 'Legal/Compliance', user: 'compliance@cloudops.io', status: 'rejected', at: ago(7100) },
    ],
    payload: 'bucket=s3-legacy-backups-2019\nforce_delete=false',
    comments: [
      { author: 'compliance@cloudops.io', at: ago(7100), text: 'Retención legal activa hasta Q4 — rechazado.' },
    ],
    decidedAt: ago(7100),
    decidedBy: 'compliance@cloudops.io',
    decisionNote: 'Rechazado — revisar política de retención FIN-102.',
    tags: ['s3', 'compliance'],
  },
  {
    id: 'apr-2385',
    action: 'Rotar secreto API',
    actionType: 'secret_rotate',
    source: 'jenkins',
    resource: 'jenkins-prod-credentials',
    resourceId: 'cred-api-prod-v3',
    cloud: 'aws',
    environment: 'production',
    requester: 'devops@cloudops.io',
    requesterTeam: 'DevOps',
    risk: 'medium',
    status: 'approved',
    requestedAt: ago(14400),
    slaDeadline: ago(14280),
    slaMinutes: 120,
    changeTicket: 'SEC-441',
    justification: 'Rotación programada trimestral de credenciales Jenkins.',
    approvedSubject: 'Rotar credencial Jenkins «cred-api-prod-v3»',
    onApproveEffect: 'Se generará nueva credencial y se notificará a pipelines de producción.',
    sourceEntityId: 'cred-api-prod-v3',
    sourceEntityLabel: 'jenkins-prod-credentials',
    impact: {
      costDelta: '—',
      downtime: 'Ninguno',
      affectedServices: ['ci-cd-prod', 'deploy-hooks'],
      blastRadius: 'Credencial Jenkins · pipelines prod',
    },
    approversRequired: 1,
    approversCompleted: 1,
    approvalChain: [{ role: 'Security', user: 'security@cloudops.io', status: 'approved', at: ago(14350) }],
    payload: 'credential_id=cred-api-prod-v3\nnotify_pipelines=true',
    comments: [],
    decidedAt: ago(14350),
    decidedBy: 'security@cloudops.io',
    tags: ['jenkins', 'secrets'],
  },
  {
    id: 'apr-2380',
    action: 'Lanzar plantilla AKS',
    actionType: 'template_launch',
    source: 'service-catalog',
    resource: 'tpl-8b · Azure AKS cluster',
    resourceId: 'launch-sc-8790',
    cloud: 'azure',
    environment: 'staging',
    requester: 'cloud-native@cloudops.io',
    requesterTeam: 'Cloud Native',
    risk: 'medium',
    status: 'expired',
    requestedAt: ago(43200),
    slaDeadline: ago(41400),
    slaMinutes: 180,
    changeTicket: 'CHG-4790',
    justification: 'PoC cluster AKS para evaluación de migración.',
    approvedSubject: 'Lanzar plantilla «Azure AKS cluster» (tpl-8b) en Staging',
    onApproveEffect: 'Se crearía un cluster AKS de 3 nodos (+$180/mes) — solicitud expirada.',
    sourceEntityId: 'tpl-8b',
    sourceEntityLabel: 'Azure AKS cluster',
    impact: {
      costDelta: '+$180/mes',
      downtime: 'Ninguno',
      affectedServices: [],
      blastRadius: 'Nuevo cluster staging',
    },
    approversRequired: 1,
    approversCompleted: 0,
    approvalChain: [{ role: 'Platform Admin', user: 'admin@cloudops.io', status: 'pending' }],
    payload: 'node_count=3\nvm_size=Standard_D4s_v3',
    comments: [
      { author: 'system', at: ago(41400), text: 'SLA expirado — solicitud cerrada automáticamente.' },
    ],
    tags: ['azure', 'kubernetes'],
  },
]

export const defaultApprovalPolicies: ApprovalPolicy[] = [
  {
    id: 'pol-prod-destroy',
    name: 'Destrucción en producción',
    description: 'Terraform destroy, delete instance o eliminación de recursos en producción requiere 2 aprobadores incluyendo Security.',
    scope: 'environment=production AND action IN (destroy, delete)',
    minApprovers: 2,
    riskThreshold: 'critical',
    environments: ['production'],
    sources: ['terraform', 'instances', 'service-catalog'],
    enabled: true,
    lastTriggered: ago(42),
    pendingCount: 2,
  },
  {
    id: 'pol-finops-cost',
    name: 'Cambios con impacto FinOps',
    description: 'Apply o lanzamientos con delta de coste > $50/mes requieren aprobación FinOps.',
    scope: 'cost_delta > 50 OR template_launch',
    minApprovers: 1,
    riskThreshold: 'high',
    environments: ['production', 'staging'],
    sources: ['terraform', 'service-catalog'],
    enabled: true,
    lastTriggered: ago(95),
    pendingCount: 2,
  },
  {
    id: 'pol-runbook-prod',
    name: 'Runbooks en producción',
    description: 'Ejecución manual de runbooks en producción requiere SRE Lead u on-call.',
    scope: 'source=runbooks AND environment=production',
    minApprovers: 1,
    riskThreshold: 'high',
    environments: ['production'],
    sources: ['runbooks'],
    enabled: true,
    lastTriggered: ago(8640),
    pendingCount: 0,
  },
  {
    id: 'pol-staging-auto',
    name: 'Auto-aprobación staging (bajo riesgo)',
    description: 'Acciones de riesgo bajo en development/staging pueden auto-aprobarse si no hay SLA breach.',
    scope: 'risk=low AND environment IN (staging, development)',
    minApprovers: 0,
    riskThreshold: 'low',
    environments: ['staging', 'development'],
    sources: ['terraform', 'instances', 'jenkins'],
    enabled: true,
    lastTriggered: ago(210),
    pendingCount: 1,
  },
]

export const defaultApprovalRequestsSnapshot = (): ApprovalRequest[] =>
  structuredClone(defaultApprovalRequests)
