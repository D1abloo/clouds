/** Demo datasets for Fase 28 advanced modules */

export type ResourceType =
  | 'instance'
  | 'vps'
  | 'cloud-account'
  | 'region'
  | 'docker'
  | 'kubernetes'
  | 'jenkins'
  | 'terraform'
  | 'alert'
  | 'log'
  | 'cost'
  | 'user'
  | 'secret'
  | 'network'

export interface ExplorerResource {
  id: string
  name: string
  type: ResourceType
  provider: string
  region: string
  status: string
  detail: string
  route?: string
}

export const EXPLORER_RESOURCES: ExplorerResource[] = [
  { id: 'i-001', name: 'web-prod-01', type: 'instance', provider: 'AWS', region: 'eu-west-1', status: 'running', detail: 't3.large · $84/mo', route: '/instances/all-instances' },
  { id: 'i-002', name: 'db-primary', type: 'instance', provider: 'AWS', region: 'eu-west-1', status: 'running', detail: 'r5.xlarge · $320/mo', route: '/instances/all-instances' },
  { id: 'vps-01', name: 'vps-bastion-01', type: 'vps', provider: 'VPS', region: 'fra1', status: 'running', detail: 'Bare metal · SSH enabled', route: '/vps/overview' },
  { id: 'acc-aws', name: 'aws-production', type: 'cloud-account', provider: 'AWS', region: 'global', status: 'active', detail: '12 regions · 48 instances', route: '/cloud/aws/overview' },
  { id: 'acc-gcp', name: 'gcp-analytics', type: 'cloud-account', provider: 'GCP', region: 'global', status: 'active', detail: '3 projects · 22 instances', route: '/cloud/gcp/overview' },
  { id: 'reg-eu', name: 'eu-west-1', type: 'region', provider: 'AWS', region: 'eu-west-1', status: 'active', detail: '18 instances', route: '/cloud/aws/regions' },
  { id: 'dk-nginx', name: 'nginx-edge', type: 'docker', provider: 'Docker', region: 'vps-prod', status: 'running', detail: 'Container · port 443', route: '/docker/containers' },
  { id: 'pod-api', name: 'checkout-api-7f2k9', type: 'kubernetes', provider: 'K8s', region: 'prod-cluster', status: 'running', detail: 'namespace: checkout', route: '/kubernetes/pods' },
  { id: 'pod-fail', name: 'worker-crash-loop', type: 'kubernetes', provider: 'K8s', region: 'prod-cluster', status: 'failed', detail: 'CrashLoopBackOff', route: '/kubernetes/pods' },
  { id: 'job-deploy', name: 'deploy-staging', type: 'jenkins', provider: 'Jenkins', region: 'ci-01', status: 'success', detail: 'Build #842', route: '/jenkins/jobs' },
  { id: 'job-fail', name: 'integration-tests', type: 'jenkins', provider: 'Jenkins', region: 'ci-01', status: 'failed', detail: 'Build #841 failed', route: '/jenkins/failed-builds' },
  { id: 'tf-run', name: 'aws-production-plan', type: 'terraform', provider: 'Terraform', region: 'aws', status: 'applied', detail: 'Run #128 · 3 resources', route: '/terraform/workspaces' },
  { id: 'alert-1', name: 'High CPU web-prod-01', type: 'alert', provider: 'AWS', region: 'eu-west-1', status: 'warning', detail: 'CPU > 90% for 5m', route: '/alerts/active' },
  { id: 'alert-2', name: 'Backup failed snap-staging', type: 'alert', provider: 'VPS', region: 'fra1', status: 'critical', detail: 'Backup window exceeded', route: '/alerts/critical' },
  { id: 'log-1', name: 'OOMKilled checkout-api', type: 'log', provider: 'K8s', region: 'prod', status: 'error', detail: '2 min ago', route: '/logs' },
  { id: 'cost-1', name: 'AWS monthly spike', type: 'cost', provider: 'AWS', region: 'global', status: 'warning', detail: '+18% vs forecast', route: '/billing/overview' },
  { id: 'user-1', name: 'admin@cloudops.local', type: 'user', provider: 'CloudOps', region: 'global', status: 'active', detail: 'Super Admin', route: '/admin/users' },
  { id: 'sec-1', name: 'aws-prod-deploy', type: 'secret', provider: 'Vault', region: 'global', status: 'running', detail: 'Expires in 45 days', route: '/secrets-manager' },
  { id: 'net-1', name: 'vpc-prod-main', type: 'network', provider: 'AWS', region: 'eu-west-1', status: 'running', detail: '10.0.0.0/16 · 6 subnets', route: '/network' },
]

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  instance: 'Instances',
  vps: 'VPS',
  'cloud-account': 'Cloud Accounts',
  region: 'Regions',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  jenkins: 'Jenkins',
  terraform: 'Terraform',
  alert: 'Alerts',
  log: 'Logs',
  cost: 'Costs',
  user: 'Users',
  secret: 'Secrets',
  network: 'Network',
}

export interface TopologyNode {
  id: string
  label: string
  kind: 'cloud' | 'account' | 'region' | 'network' | 'instance' | 'vps' | 'docker' | 'k8s' | 'service'
  provider: string
  status: 'healthy' | 'warning' | 'critical'
  x: number
  y: number
}

export interface TopologyEdge {
  from: string
  to: string
}

export const TOPOLOGY_NODES: TopologyNode[] = [
  { id: 'aws', label: 'AWS', kind: 'cloud', provider: 'AWS', status: 'healthy', x: 80, y: 60 },
  { id: 'gcp', label: 'GCP', kind: 'cloud', provider: 'GCP', status: 'healthy', x: 80, y: 200 },
  { id: 'acc-aws', label: 'aws-prod', kind: 'account', provider: 'AWS', status: 'healthy', x: 220, y: 60 },
  { id: 'reg-eu', label: 'eu-west-1', kind: 'region', provider: 'AWS', status: 'healthy', x: 380, y: 60 },
  { id: 'vpc-main', label: 'vpc-main', kind: 'network', provider: 'AWS', status: 'healthy', x: 540, y: 60 },
  { id: 'web-01', label: 'web-prod-01', kind: 'instance', provider: 'AWS', status: 'warning', x: 700, y: 30 },
  { id: 'db-01', label: 'db-primary', kind: 'instance', provider: 'AWS', status: 'healthy', x: 700, y: 90 },
  { id: 'vps-01', label: 'vps-bastion', kind: 'vps', provider: 'VPS', status: 'healthy', x: 380, y: 200 },
  { id: 'docker-01', label: 'docker-host', kind: 'docker', provider: 'Docker', status: 'healthy', x: 540, y: 200 },
  { id: 'k8s', label: 'prod-cluster', kind: 'k8s', provider: 'K8s', status: 'warning', x: 220, y: 200 },
  { id: 'svc-api', label: 'checkout-api', kind: 'service', provider: 'K8s', status: 'critical', x: 700, y: 200 },
]

export const TOPOLOGY_EDGES: TopologyEdge[] = [
  { from: 'aws', to: 'acc-aws' },
  { from: 'acc-aws', to: 'reg-eu' },
  { from: 'reg-eu', to: 'vpc-main' },
  { from: 'vpc-main', to: 'web-01' },
  { from: 'vpc-main', to: 'db-01' },
  { from: 'gcp', to: 'k8s' },
  { from: 'k8s', to: 'svc-api' },
  { from: 'vps-01', to: 'docker-01' },
]

export interface CopilotMessage {
  role: 'user' | 'assistant'
  text: string
  ts: number
}

export const COPILOT_SUGGESTIONS = [
  '¿Qué instancia consume más?',
  '¿Qué recursos están fallando?',
  '¿Dónde puedo ahorrar coste?',
  'Resume el estado de Kubernetes.',
  'Genera diagnóstico de esta VPS.',
  'Qué alertas críticas hay ahora.',
  'Qué acciones pendientes de aprobación existen.',
]

export const COPILOT_RESPONSES: Record<string, string> = {
  '¿Qué instancia consume más?':
    '**db-primary** (AWS r5.xlarge) es la instancia con mayor coste estimado: **$320/mes**. Le sigue web-prod-01 con $84/mo. Recomendación: revisar sizing en Cost Optimizer.',
  '¿Qué recursos están fallando?':
    'Recursos en estado crítico/error:\n• Pod **worker-crash-loop** — CrashLoopBackOff\n• Jenkins job **integration-tests** — build #841 failed\n• Alerta **Backup failed snap-staging**\n• Servicio **checkout-api** — latencia elevada',
  '¿Dónde puedo ahorrar coste?':
    'Oportunidades detectadas (demo):\n• Downsize **web-prod-01** → ahorro ~$420/mo\n• Eliminar volumen **vol-orphan-001** → $85/mo\n• Reserved instance para **gcp-analytics-vm** → $310/mo\nTotal estimado: **$2,840/mo**',
  'Resume el estado de Kubernetes.':
    'Cluster **prod-cluster**: 12 pods running, 2 warning, 1 critical. Namespace checkout con deployment estable. Pod checkout-api-7f2k9 OK. **worker-crash-loop** requiere atención (OOM).',
  'Genera diagnóstico de esta VPS.':
    'Diagnóstico **vps-bastion-01**:\n• CPU 24% · RAM 61% · Disk 48%\n• SSH activo · puerto 22 expuesto (revisar Security Center)\n• Docker host con 6 contenedores\n• Último backup: hace 6h — OK',
  'Qué alertas críticas hay ahora.':
    '**2 alertas críticas** activas:\n1. Backup failed snap-staging (VPS fra1)\n2. High CPU web-prod-01 (AWS eu-west-1)\n3 warning adicionales en K8s y costes.',
  'Qué acciones pendientes de aprobación existen.':
    '**4 aprobaciones pendientes**:\n• Terraform destroy aws-staging-vpc\n• Stop instance db-primary-prod\n• Terraform apply gcp-analytics\n• Delete volume vol-orphan-001',
}

export const defaultCopilotResponse = (q: string): string =>
  `Análisis demo para: "${q}"\n\nEstado general: 94% healthy, 4 warnings, 2 critical. Revisa Health Center y Resource Explorer para detalle. ¿Quieres que abra un runbook o programe una acción?`
