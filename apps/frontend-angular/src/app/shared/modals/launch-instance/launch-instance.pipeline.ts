export type LaunchPhaseStatus = 'pending' | 'active' | 'done' | 'error'

export interface LaunchPipelinePhase {
  id: string
  label: string
  description: string
  icon: string
  weight: number
  weightLabel: string
  status: LaunchPhaseStatus
  percent: number
  detailLine?: string
}

const phase = (
  id: string,
  label: string,
  description: string,
  icon: string,
  weight: number,
): LaunchPipelinePhase => ({
  id,
  label,
  description,
  icon,
  weight,
  weightLabel: `${weight}%`,
  status: 'pending',
  percent: 0,
})

export const createLaunchPipeline = (): LaunchPipelinePhase[] => [
  phase('validate', 'Validación', 'Cuenta, región, workspace y límites de coste', 'fact_check', 8),
  phase('init', 'terraform init', 'Providers hashicorp/aws, google o azurerm', 'download', 12),
  phase('plan', 'terraform plan', 'Diff de recursos: create, update, destroy', 'description', 18),
  phase('policy', 'Políticas', 'OPA, Sentinel y umbral mensual USD', 'policy', 10),
  phase('apply', 'terraform apply', 'Creación de VM, discos, NIC y reglas de red', 'play_circle', 35),
  phase('persist', 'Registro', 'State remoto S3/GCS y entrada en carpeta Terraform', 'folder', 10),
  phase('health', 'Health check', 'SSH/ICMP, cloud-init y métricas CloudWatch', 'monitor_heart', 7),
]

export const LAUNCH_PHASE_LOGS: Record<string, string[]> = {
  validate: [
    '> Validando cloudAccountId y permisos IAM…',
    '> Workspace destino resuelto',
    '> Límites de coste: OK',
  ],
  init: [
    '> terraform init -upgrade',
    'Initializing provider plugins…',
    'Terraform has been successfully initialized!',
  ],
  plan: [
    '> terraform plan -out=tfplan',
    'Refreshing state…',
    'Plan: 1 to add, 0 to change, 0 to destroy.',
  ],
  policy: [
    '> policy check --bundle compliance',
    'Cost guardrail: dentro del umbral',
    'Tag policy env=prod: PASS',
  ],
  apply: [
    '> terraform apply -auto-approve tfplan',
    'aws_instance.web: Creating…',
    'aws_instance.web: Creation complete after 42s',
  ],
  persist: [
    '> Subiendo state a backend remoto…',
    '> Registrando lanzamiento en carpeta apps/',
  ],
  health: [
    '> Esperando cloud-init…',
    '> Ping 10.0.1.12: OK',
    '> Instance status: running',
  ],
}

export const computeOverallLaunchPercent = (phases: LaunchPipelinePhase[]): number => {
  const total = phases.reduce((s, p) => s + p.weight, 0)
  if (total === 0) return 0
  const done = phases.reduce((s, p) => s + (p.percent / 100) * p.weight, 0)
  return Math.min(100, Math.round(done))
}

export const PROVIDER_DETAILS: Record<
  string,
  { regions: string; services: string; sla: string }
> = {
  AWS: {
    regions: '33 regiones · 99.99% SLA EC2',
    services: 'EC2, EBS, VPC, IAM, CloudWatch',
    sla: 'RTO estimado: 4–8 min',
  },
  GCP: {
    regions: '40+ regiones · Live migration',
    services: 'Compute Engine, VPC, Cloud IAM',
    sla: 'RTO estimado: 5–10 min',
  },
  AZURE: {
    regions: '60+ regiones · Availability sets',
    services: 'Virtual Machines, VNet, NSG, Managed Disks',
    sla: 'RTO estimado: 6–12 min',
  },
}
