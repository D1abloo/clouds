import type { FinopsCloudProvider } from './mock-billing'

export interface FinopsInstance {
  id: string
  name: string
  provider: FinopsCloudProvider
  region: string
  type: string
  monthlyCost: number
  utilization: number
  recommendation: string
  severity: 'high' | 'medium' | 'low'
  status: 'running' | 'stopped' | 'idle'
}

export const FINOPS_INSTANCES: FinopsInstance[] = [
  { id: 'i-0a1b2c3', name: 'api-gateway-prod-01', provider: 'AWS', region: 'eu-west-1', type: 'm6i.xlarge', monthlyCost: 312.4, utilization: 82, recommendation: 'Cobertura RI recomendada', severity: 'low', status: 'running' },
  { id: 'i-0d4e5f6', name: 'batch-worker-night', provider: 'AWS', region: 'eu-central-1', type: 'c6i.2xlarge', monthlyCost: 428.9, utilization: 12, recommendation: 'Redimensionar a c6i.large o programar apagado', severity: 'high', status: 'idle' },
  { id: 'gce-analytics-01', name: 'bq-etl-runner', provider: 'GCP', region: 'europe-west1', type: 'n2-standard-4', monthlyCost: 198.5, utilization: 45, recommendation: 'Migrar a spot/preemptible para cargas batch', severity: 'medium', status: 'running' },
  { id: 'vm-portal-02', name: 'portal-frontend', provider: 'Azure', region: 'westeurope', type: 'Standard_D4s_v3', monthlyCost: 276.0, utilization: 68, recommendation: 'Sin cambios — uso saludable', severity: 'low', status: 'running' },
  { id: 'i-0g7h8i9', name: 'legacy-monolith', provider: 'AWS', region: 'eu-west-1', type: 'r5.2xlarge', monthlyCost: 612.0, utilization: 8, recommendation: 'Apagar o eliminar — sin tráfico 30 días', severity: 'high', status: 'stopped' },
  { id: 'gce-dev-sandbox', name: 'dev-sandbox-vm', provider: 'GCP', region: 'europe-west4', type: 'e2-medium', monthlyCost: 42.3, utilization: 5, recommendation: 'Programar apagado fuera de horario laboral', severity: 'medium', status: 'idle' },
]
