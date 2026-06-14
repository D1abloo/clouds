/** Static reference catalog for advanced modules; live data is loaded from API in PRO. */

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

export interface CopilotAction {
  id: string
  label: string
  icon: string
  route?: string
}

export interface CopilotLaunchProgress {
  percent: number
  step: string
  status: 'running' | 'success' | 'error'
}

export interface CopilotMessage {
  role: 'user' | 'assistant'
  text: string
  ts: number
  actions?: CopilotAction[]
  sources?: string[]
  launchProgress?: CopilotLaunchProgress
}

export type CopilotContextId =
  | 'instances'
  | 'alerts'
  | 'costs'
  | 'kubernetes'
  | 'approvals'
  | 'security'

export interface CopilotContextDomain {
  id: CopilotContextId
  label: string
  icon: string
  count: string
  hint: string
}

export interface CopilotQuickPrompt {
  id: string
  label: string
  question: string
  icon: string
  context: CopilotContextId
}

export const COPILOT_CONTEXT_DOMAINS: CopilotContextDomain[] = [
  { id: 'instances', label: 'Instancias', icon: 'dns', count: '48', hint: 'EC2, VPS y compute cloud' },
  { id: 'alerts', label: 'Alertas', icon: 'warning', count: '12', hint: '3 críticas · 5 warning' },
  { id: 'costs', label: 'Costes', icon: 'payments', count: '$4.2k', hint: 'Gasto mensual estimado' },
  { id: 'kubernetes', label: 'Kubernetes', icon: 'hub', count: '15 pods', hint: '1 crítico · prod-cluster' },
  { id: 'approvals', label: 'Aprobaciones', icon: 'rule', count: '4', hint: 'Acciones pendientes' },
  { id: 'security', label: 'Seguridad', icon: 'shield', count: '92', hint: 'Score de postura' },
]

export const COPILOT_QUICK_PROMPTS: CopilotQuickPrompt[] = [
  { id: 'top-cost', label: 'Mayor coste', question: '¿Qué instancia consume más?', icon: 'trending_up', context: 'instances' },
  { id: 'failures', label: 'Recursos fallando', question: '¿Qué recursos están fallando?', icon: 'error_outline', context: 'alerts' },
  { id: 'savings', label: 'Ahorro', question: '¿Dónde puedo ahorrar coste?', icon: 'savings', context: 'costs' },
  { id: 'billing', label: 'Facturas', question: 'Resume facturas, gasto por proveedor y anomalías FinOps.', icon: 'receipt_long', context: 'costs' },
  { id: 'k8s', label: 'Estado K8s', question: 'Resume el estado de Kubernetes.', icon: 'hub', context: 'kubernetes' },
  { id: 'vps', label: 'VPS por SSH', question: 'Revisa servidores VPS añadidos por SSH y su estado.', icon: 'terminal', context: 'instances' },
  { id: 'launch', label: 'Lanzar compute', question: 'Ayúdame a lanzar una instancia desde AI Infra Studio.', icon: 'rocket_launch', context: 'instances' },
  { id: 'jenkins-deploy', label: 'Deploy Jenkins', question: 'Revisa Jenkins y dime cómo desplegar una app.', icon: 'build', context: 'approvals' },
  { id: 'critical', label: 'Alertas críticas', question: '¿Qué alertas críticas hay ahora?', icon: 'notification_important', context: 'alerts' },
  { id: 'approvals', label: 'Aprobaciones', question: '¿Qué acciones pendientes de aprobación existen?', icon: 'rule', context: 'approvals' },
  { id: 'security', label: 'Postura seguridad', question: 'Resume la postura de seguridad actual.', icon: 'shield', context: 'security' },
]

export const COPILOT_SUGGESTIONS = COPILOT_QUICK_PROMPTS.map((p) => p.question)

export interface CopilotResponsePayload {
  text: string
  actions?: CopilotAction[]
  sources?: string[]
}

export const COPILOT_RESPONSES: Record<string, CopilotResponsePayload> = {
  '¿Qué instancia consume más?': {
    text: '**db-primary** (AWS r5.xlarge, eu-west-1) concentra el mayor coste: **$320/mes** (~38% del gasto compute).\n\nSiguientes:\n• web-prod-01 — $84/mo (t3.large, CPU media 34%)\n• gcp-analytics-vm — $76/mo\n\nRecomendación: evaluar Reserved Instance para db-primary y rightsizing de web-prod-01 en Cost Optimizer.',
    actions: [
      { id: 'cost-opt', label: 'Abrir Cost Optimizer', icon: 'savings', route: '/cost-optimizer' },
      { id: 'instances', label: 'Ver instancias', icon: 'dns', route: '/instances/all-instances' },
    ],
    sources: ['Inventario', 'Billing AWS', 'Cost Optimizer'],
  },
  '¿Qué recursos están fallando?': {
    text: 'Detecté **4 recursos** que requieren atención inmediata:\n\n1. Pod **worker-crash-loop** — CrashLoopBackOff (OOM, namespace checkout)\n2. Jenkins **integration-tests** — build #841 failed hace 22 min\n3. Alerta **Backup failed snap-staging** — VPS fra1\n4. Servicio **checkout-api** — latencia p95 > 800 ms\n\nPrioridad sugerida: estabilizar el pod K8s y revisar el pipeline CI.',
    actions: [
      { id: 'k8s', label: 'Pods Kubernetes', icon: 'hub', route: '/kubernetes/pods' },
      { id: 'jenkins', label: 'Builds fallidos', icon: 'build', route: '/jenkins/failed-builds' },
      { id: 'alerts', label: 'Alertas activas', icon: 'warning', route: '/alerts/active' },
    ],
    sources: ['Health Center', 'Kubernetes', 'Jenkins', 'Alertas'],
  },
  '¿Dónde puedo ahorrar coste?': {
    text: 'Oportunidades de ahorro identificadas:\n\n• Rightsizing de instancias con baja CPU sostenida.\n• Eliminar volúmenes huérfanos si aparecen en inventario.\n• Revisar compromisos/RI/Savings Plans para cargas estables.\n• Apagar snapshots staging fuera de retención.\n\nAbre FinOps para confirmar importes reales antes de aplicar cambios.',
    actions: [
      { id: 'cost', label: 'Cost Optimizer', icon: 'savings', route: '/cost-optimizer' },
      { id: 'billing', label: 'Billing overview', icon: 'receipt_long', route: '/billing/overview' },
    ],
    sources: ['Cost Optimizer', 'Billing', 'Inventario'],
  },
  'Resume el estado de Kubernetes.': {
    text: 'Estado Kubernetes basado en los clusters conectados:\n\n• Revisa pods en warning/critical.\n• Comprueba reinicios, HPA e ingress.\n• Cruza eventos con logs de Observabilidad.\n\nAbre Kubernetes para ver namespaces y recursos sincronizados.',
    actions: [
      { id: 'pods', label: 'Ver pods', icon: 'hub', route: '/kubernetes/pods' },
      { id: 'topology', label: 'Mapa topología', icon: 'account_tree', route: '/topology-map' },
    ],
    sources: ['Kubernetes', 'Logs', 'Topology Map'],
  },
  'Genera diagnóstico de esta VPS.': {
    text: 'Diagnóstico VPS:\n\n• Revisa servidores añadidos por SSH en **VPS → Servidores**.\n• Valida acceso SSH, runtime Docker/Kubernetes y métricas.\n• Si el puerto 22 está expuesto, revisa reglas en Seguridad.\n• Cruza disponibilidad con logs y auditoría.',
    actions: [
      { id: 'vps', label: 'Overview VPS', icon: 'dns', route: '/vps/overview' },
      { id: 'security', label: 'Security Center', icon: 'shield', route: '/security-center' },
    ],
    sources: ['VPS', 'Docker', 'Security Center'],
  },
  '¿Qué alertas críticas hay ahora?': {
    text: '**2 alertas críticas** activas y **3 warning**:\n\nCríticas:\n1. **Backup failed snap-staging** — VPS fra1 · hace 18 min\n2. **High CPU web-prod-01** — AWS eu-west-1 · CPU > 90% · 5 min\n\nWarning:\n• K8s pod restart rate elevado\n• Spike coste AWS +18% vs forecast\n• Certificado staging expira en 12 días',
    actions: [
      { id: 'critical', label: 'Alertas críticas', icon: 'notification_important', route: '/alerts/critical' },
      { id: 'incidents', label: 'Incidentes', icon: 'report', route: '/incidents' },
    ],
    sources: ['Alertas', 'Métricas', 'Billing'],
  },
  'Qué alertas críticas hay ahora.': {
    text: '**2 alertas críticas** activas y **3 warning**:\n\nCríticas:\n1. **Backup failed snap-staging** — VPS fra1\n2. **High CPU web-prod-01** — AWS eu-west-1\n\nRevisa el panel de alertas para silenciar o escalar.',
    actions: [
      { id: 'critical', label: 'Alertas críticas', icon: 'notification_important', route: '/alerts/critical' },
    ],
    sources: ['Alertas'],
  },
  '¿Qué acciones pendientes de aprobación existen?': {
    text: '**4 aprobaciones** esperando decisión:\n\n• Terraform **destroy** aws-staging-vpc — solicitado por devops@cloudops.local\n• **Stop** instance db-primary-prod — ventana propuesta: hoy 22:00 UTC\n• Terraform **apply** gcp-analytics — 3 recursos nuevos\n• **Delete** volume vol-orphan-001 — ahorro $85/mo\n\nSLA medio restante: **4 h 12 min**.',
    actions: [
      { id: 'approvals', label: 'Panel aprobaciones', icon: 'rule', route: '/approvals' },
      { id: 'terraform', label: 'Terraform runs', icon: 'cloud_sync', route: '/terraform/workspaces' },
    ],
    sources: ['Aprobaciones', 'Terraform', 'Auditoría'],
  },
  'Qué acciones pendientes de aprobación existen.': {
    text: '**4 aprobaciones pendientes** — revisa el panel para aprobar o rechazar con comentario.',
    actions: [{ id: 'approvals', label: 'Panel aprobaciones', icon: 'rule', route: '/approvals' }],
    sources: ['Aprobaciones'],
  },
  'Resume la postura de seguridad actual.': {
    text: 'Postura de seguridad:\n\n• Revisa findings abiertos en Centro de seguridad.\n• Comprueba MFA, rotación de tokens y secretos cifrados.\n• Audita exposición SSH en servidores VPS.\n• Valida cumplimiento y políticas antes de cambios productivos.',
    actions: [
      { id: 'security', label: 'Security Center', icon: 'shield', route: '/security-center' },
      { id: 'secrets', label: 'Gestor secretos', icon: 'key', route: '/secrets-manager' },
    ],
    sources: ['Security Center', 'Compliance', 'Secrets Manager'],
  },
}

export const defaultCopilotResponse = (q: string, context?: CopilotContextId): CopilotResponsePayload => {
  const ctxLabel = COPILOT_CONTEXT_DOMAINS.find((d) => d.id === context)?.label ?? 'plataforma'
  return {
    text: `Consulta sobre **${ctxLabel}**: "${q}"\n\nPuedo ayudarte con instancias, lanzamientos, VPS, facturas, logs, Jenkins, seguridad y cualquier módulo conectado del panel. Usa el asistente en modo PRO para cruzar datos live del workspace.`,
    actions: [
      { id: 'explorer', label: 'Resource Explorer', icon: 'travel_explore', route: '/resource-explorer' },
      { id: 'health', label: 'Health Center', icon: 'monitor_heart', route: '/health-center' },
    ],
    sources: ['Inventario', 'Health Center'],
  }
}

export const resolveCopilotResponse = (
  question: string,
  context?: CopilotContextId,
): CopilotResponsePayload => {
  const exact = COPILOT_RESPONSES[question]
  if (exact) return exact

  const normalized = question.trim().toLowerCase()
  const fuzzy = Object.entries(COPILOT_RESPONSES).find(([key]) =>
    normalized.includes(key.slice(0, 12).toLowerCase()) ||
    key.toLowerCase().includes(normalized.slice(0, 12)),
  )
  if (fuzzy) return fuzzy[1]

  return defaultCopilotResponse(question, context)
}

export const copilotPromptsForContext = (context: CopilotContextId): CopilotQuickPrompt[] =>
  COPILOT_QUICK_PROMPTS.filter((p) => p.context === context)
