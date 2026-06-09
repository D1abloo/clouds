import type { Instance } from '../../core/models/api.models'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import type { DashboardInstanceRow } from '../dashboard/dashboard.models'
import { buildInstanceTrendChart } from '../dashboard/utils/dashboard-instance-charts.util'
import { instanceAlerts, instanceProviderLogo } from '../dashboard/utils/dashboard-instance-detail.util'

export type InstanceHealthSeverity = 'healthy' | 'warning' | 'critical' | 'down'

export type HealthSignalKind = 'cpu' | 'memory' | 'disk' | 'uptime' | 'alerts' | 'network'

export interface InstanceHealthSignal {
  id: string
  kind: HealthSignalKind
  label: string
  severity: InstanceHealthSeverity
  value: string
  threshold: string
  detail: string
}

export interface InstanceHealthRecord {
  id: string
  name: string
  provider: string
  logo?: NavLogoKey
  resourceType: string
  region: string
  instanceType: string
  status: string
  severity: InstanceHealthSeverity
  healthScore: number
  cpuPercent: number
  ramPercent: number
  diskPercent: number
  alertsActive: number
  signals: InstanceHealthSignal[]
  primaryIssue: string
  recommendation: string
  duration: string
  lastCheck: string
  route: string
  environment: string
  accountName: string
  os?: string
  publicIp?: string
  privateIp?: string
  vcpu?: number | null
  memoryGb?: number | null
  diskGb?: number | null
  monthlyCost?: number | null
  incident?: HealthIncidentDetail
}

export type HealthIncidentState = 'open' | 'investigating' | 'mitigating' | 'resolved'

export interface HealthIncidentTimelineStep {
  at: string
  label: string
  actor?: string
  note?: string
  status: 'done' | 'active' | 'pending'
}

export interface HealthIncidentDetail {
  incidentId: string
  state: HealthIncidentState
  stateLabel: string
  openedAt: string
  assignee: string
  oncallTeam: string
  impact: string
  businessImpact: string
  affectedServices: string[]
  rootCause: string
  rootCauseConfidence: 'confirmada' | 'probable' | 'hipótesis'
  remediation: string[]
  relatedAlerts: { id: string; title: string; since: string; severity: string }[]
  runbook: { id: string; name: string; route: string }
  timeline: HealthIncidentTimelineStep[]
  sloImpact: string
  escalationLevel: string
  nextReview: string
}

export interface HealthSeverityBucket {
  key: InstanceHealthSeverity
  label: string
  count: number
  pct: number
  icon: string
  tone: string
  description: string
}

export interface HealthProviderSummary {
  provider: string
  logo?: NavLogoKey
  total: number
  healthy: number
  warning: number
  critical: number
  down: number
  avgScore: number
}

export interface HealthTimelineEvent {
  time: string
  event: string
  severity: 'info' | 'warning' | 'critical'
  instanceId: string
}

export interface HealthSummary {
  total: number
  healthy: number
  warning: number
  critical: number
  down: number
  avgScore: number
  slaPct: number
  alertsOpen: number
}

const ts = (minsAgo = 0): string => {
  const d = new Date(Date.now() - minsAgo * 60_000)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const seed = (id: string): number => id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)

const normalizeStatus = (status?: string): string => {
  const s = (status ?? 'RUNNING').toUpperCase()
  if (s === 'RUNNING' || s === 'ACTIVE') return 'RUNNING'
  if (s === 'STOPPED' || s === 'STOPPING' || s === 'TERMINATED') return 'STOPPED'
  if (s === 'ERROR' || s === 'FAILED') return 'ERROR'
  if (s === 'WARNING' || s === 'DEGRADED') return 'WARNING'
  return s
}

export const instanceToDashboardRow = (inst: Instance): DashboardInstanceRow => ({
  id: inst.id,
  name: inst.name,
  provider: String(inst.provider),
  region: inst.region,
  status: normalizeStatus(inst.status),
  instanceType: inst.instanceType,
  os: inst.os,
  publicIp: inst.publicIp,
  privateIp: inst.privateIp,
  cpuCores: inst.cpuCores ?? null,
  ramGb: inst.ramGb ?? null,
  diskGb: inst.diskGb ?? null,
  monthlyCost: inst.monthlyCost ?? null,
  environment: inst.environment,
  isVps: inst.isVps,
  isDemo: inst.isDemo,
  alertCount:
    normalizeStatus(inst.status) === 'ERROR'
      ? 2
      : normalizeStatus(inst.status) === 'WARNING'
        ? 1
        : 0,
  accountName: inst.cloudAccountId,
})

const diskUsageFor = (row: DashboardInstanceRow): number => {
  const base = 45 + (seed(row.id) % 35)
  if (row.status === 'WARNING') return Math.min(base + 12, 92)
  if (row.status === 'ERROR') return Math.min(base + 18, 96)
  if (row.status === 'STOPPED') return base
  return base
}

const buildSignals = (
  row: DashboardInstanceRow,
  cpu: number,
  ram: number,
  disk: number,
): InstanceHealthSignal[] => {
  const signals: InstanceHealthSignal[] = []
  const alerts = instanceAlerts(row)

  if (row.status === 'STOPPED') {
    signals.push({
      id: `${row.id}-uptime`,
      kind: 'uptime',
      label: 'Disponibilidad',
      severity: 'down',
      value: 'Detenida',
      threshold: 'RUNNING',
      detail: 'La instancia no está en ejecución',
    })
  }

  if (cpu >= 90) {
    signals.push({
      id: `${row.id}-cpu`,
      kind: 'cpu',
      label: 'CPU',
      severity: 'critical',
      value: `${cpu}%`,
      threshold: '> 90%',
      detail: 'Uso de CPU crítico sostenido',
    })
  } else if (cpu >= 75) {
    signals.push({
      id: `${row.id}-cpu`,
      kind: 'cpu',
      label: 'CPU',
      severity: 'warning',
      value: `${cpu}%`,
      threshold: '> 75%',
      detail: 'CPU por encima del objetivo operativo',
    })
  }

  if (ram >= 88) {
    signals.push({
      id: `${row.id}-memory`,
      kind: 'memory',
      label: 'RAM',
      severity: 'critical',
      value: `${ram}%`,
      threshold: '> 88%',
      detail: 'Presión de memoria elevada',
    })
  } else if (ram >= 72) {
    signals.push({
      id: `${row.id}-memory`,
      kind: 'memory',
      label: 'RAM',
      severity: 'warning',
      value: `${ram}%`,
      threshold: '> 72%',
      detail: 'Memoria acercándose al límite',
    })
  }

  if (disk >= 92) {
    signals.push({
      id: `${row.id}-disk`,
      kind: 'disk',
      label: 'Disco',
      severity: 'critical',
      value: `${disk}%`,
      threshold: '> 92%',
      detail: 'Espacio en disco crítico',
    })
  } else if (disk >= 85) {
    signals.push({
      id: `${row.id}-disk`,
      kind: 'disk',
      label: 'Disco',
      severity: 'warning',
      value: `${disk}%`,
      threshold: '> 85%',
      detail: 'Disco por encima del umbral recomendado',
    })
  }

  for (const alert of alerts) {
    signals.push({
      id: `${row.id}-alert-${alert.title}`,
      kind: 'alerts',
      label: 'Alerta',
      severity: alert.severity === 'CRITICAL' ? 'critical' : 'warning',
      value: alert.title,
      threshold: alert.severity,
      detail: alert.since,
    })
  }

  if (row.status === 'WARNING' && !signals.some((s) => s.kind === 'network')) {
    signals.push({
      id: `${row.id}-network`,
      kind: 'network',
      label: 'Health check',
      severity: 'warning',
      value: 'Degradado',
      threshold: 'OK',
      detail: 'Latencia o chequeo de salud fuera de rango',
    })
  }

  if (row.status === 'ERROR') {
    signals.push({
      id: `${row.id}-error`,
      kind: 'uptime',
      label: 'Estado',
      severity: 'critical',
      value: 'Error',
      threshold: 'RUNNING',
      detail: 'La instancia reporta estado de error',
    })
  }

  return signals
}

const resolveSeverity = (
  row: DashboardInstanceRow,
  signals: InstanceHealthSignal[],
): InstanceHealthSeverity => {
  if (row.status === 'STOPPED') return 'down'
  const max = signals.reduce<InstanceHealthSeverity>((acc, s) => {
    if (s.severity === 'critical') return 'critical'
    if (s.severity === 'warning' && acc !== 'critical') return 'warning'
    return acc
  }, 'healthy')
  if (max !== 'healthy') return max
  if (row.status === 'ERROR') return 'critical'
  if (row.status === 'WARNING') return 'warning'
  return 'healthy'
}

const computeScore = (
  severity: InstanceHealthSeverity,
  cpu: number,
  ram: number,
  disk: number,
  alerts: number,
): number => {
  if (severity === 'down') return Math.max(8, 22 - alerts * 3)
  let score = 100
  if (severity === 'critical') score -= 38
  if (severity === 'warning') score -= 20
  score -= Math.max(0, cpu - 65) * 0.45
  score -= Math.max(0, ram - 65) * 0.35
  score -= Math.max(0, disk - 75) * 0.55
  score -= alerts * 7
  return Math.round(Math.max(5, Math.min(100, score)))
}

const primaryIssueFor = (signals: InstanceHealthSignal[], severity: InstanceHealthSeverity): string => {
  const top = signals.find((s) => s.severity === 'critical') ?? signals.find((s) => s.severity === 'warning')
  if (top) return `${top.label}: ${top.value}`
  if (severity === 'healthy') return 'Sin incidencias activas'
  return 'Estado operativo degradado'
}

const recommendationFor = (signals: InstanceHealthSignal[], row: DashboardInstanceRow): string => {
  const cpu = signals.find((s) => s.kind === 'cpu')
  if (cpu?.severity === 'critical') return 'Escalar tipo de instancia o reducir carga de procesos'
  if (signals.some((s) => s.kind === 'disk')) return 'Ampliar volumen o purgar logs y snapshots antiguos'
  if (signals.some((s) => s.kind === 'memory')) return 'Revisar límites de memoria y procesos residentes'
  if (row.status === 'STOPPED') return 'Iniciar instancia o verificar política de apagado programado'
  if (signals.some((s) => s.kind === 'alerts')) return 'Revisar alertas abiertas y ejecutar runbook de remediación'
  if (row.status === 'WARNING') return 'Validar health checks y métricas en ventana de 15 min'
  return 'Continuar monitorización — métricas dentro de rango'
}

const durationFor = (severity: InstanceHealthSeverity, id: string): string => {
  const mins = (seed(id) % 90) + (severity === 'critical' ? 8 : severity === 'warning' ? 3 : 0)
  if (mins >= 60) return `${Math.floor(mins / 60)} h ${mins % 60} min`
  return `${mins} min`
}

const incidentIdFor = (id: string): string => {
  const n = 1000 + (seed(id) % 8999)
  return `INC-${n}`
}

const incidentStateFor = (severity: InstanceHealthSeverity): { state: HealthIncidentState; label: string } => {
  if (severity === 'critical') return { state: 'investigating', label: 'En investigación' }
  if (severity === 'down') return { state: 'open', label: 'Abierta' }
  return { state: 'mitigating', label: 'En mitigación' }
}

export const buildIncidentDetail = (record: InstanceHealthRecord): HealthIncidentDetail => {
  const { state, label: stateLabel } = incidentStateFor(record.severity)
  const incidentId = incidentIdFor(record.id)
  const minsOpen = seed(record.id) % 90 + (record.severity === 'critical' ? 15 : 5)
  const openedDate = new Date(Date.now() - minsOpen * 60_000)
  const openedAt = openedDate.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })

  const cpuSig = record.signals.find((s) => s.kind === 'cpu')
  const memSig = record.signals.find((s) => s.kind === 'memory')
  const diskSig = record.signals.find((s) => s.kind === 'disk')

  let rootCause = 'Degradación operativa detectada por monitorización sintética y métricas de infraestructura.'
  let rootCauseConfidence: HealthIncidentDetail['rootCauseConfidence'] = 'hipótesis'
  if (memSig?.severity === 'critical') {
    rootCause = 'Presión de memoria sostenida — posible OOMKilled o límite de cgroup insuficiente para la carga actual.'
    rootCauseConfidence = 'probable'
  } else if (cpuSig?.severity === 'critical') {
    rootCause = 'Saturación de CPU sostenida (>90 %) — posible pico de tráfico o proceso runaway sin autoscaling.'
    rootCauseConfidence = 'probable'
  } else if (diskSig) {
    rootCause = 'Espacio en disco por encima del umbral operativo — riesgo de fallo en escritura de logs y snapshots.'
    rootCauseConfidence = 'probable'
  } else if (record.status === 'STOPPED') {
    rootCause = 'Recurso detenido de forma inesperada o por política de apagado — servicio no disponible.'
    rootCauseConfidence = 'confirmada'
  }

  const affectedServices =
    record.environment === 'production'
      ? ['checkout-api', 'payment-webhook', record.name]
      : [record.name, `${record.provider.toLowerCase()}-staging`]

  const relatedAlerts = record.signals
    .filter((s) => s.kind === 'alerts' || s.severity !== 'healthy')
    .slice(0, 5)
    .map((s) => ({
      id: `ALT-${seed(record.id + s.id) % 9000 + 1000}`,
      title: `${s.label}: ${s.value}`,
      since: record.duration,
      severity: s.severity === 'critical' ? 'Crítica' : 'Advertencia',
    }))

  if (!relatedAlerts.length) {
    relatedAlerts.push({
      id: `ALT-${seed(record.id) % 9000 + 1000}`,
      title: record.primaryIssue,
      since: record.duration,
      severity: record.severity === 'critical' ? 'Crítica' : 'Advertencia',
    })
  }

  const remediation = [
    record.recommendation,
    'Validar métricas en ventana de 15 min tras aplicar mitigación.',
    record.severity === 'critical' ? 'Escalar a ingeniero de guardia si no hay mejora en 30 min.' : 'Documentar acciones en el ticket de incidencia.',
  ]

  const timeline: HealthIncidentTimelineStep[] = [
    {
      at: openedAt,
      label: 'Incidencia detectada',
      actor: 'Monitorización automática',
      note: record.primaryIssue,
      status: 'done',
    },
    {
      at: record.lastCheck,
      label: 'Alerta enriquecida',
      actor: 'CloudOps Observabilidad',
      note: `${record.alertsActive} alerta(s) activa(s) · score ${record.healthScore}%`,
      status: 'done',
    },
    {
      at: record.lastCheck,
      label: stateLabel,
      actor: 'oncall@cloudops.io',
      note: record.recommendation,
      status: 'active',
    },
    {
      at: 'Pendiente',
      label: 'Verificación post-mitigación',
      actor: 'SRE',
      note: 'Confirmar recuperación de SLO y cierre de alertas',
      status: 'pending',
    },
  ]

  const sloImpact =
    record.severity === 'critical'
      ? `Error budget consumido · disponibilidad estimada −0,08 % en ${record.duration}`
      : record.severity === 'warning'
        ? `Impacto acotado · latencia/degradación parcial en ${record.duration}`
        : 'Sin impacto en SLO tier-1 confirmado'

  return {
    incidentId,
    state,
    stateLabel,
    openedAt,
    assignee: 'oncall@cloudops.io',
    oncallTeam: 'SRE · Plataforma',
    impact: `${record.resourceType} ${record.name} en ${record.region} — ${record.primaryIssue}`,
    businessImpact:
      record.environment === 'production'
        ? 'Riesgo de degradación en servicios tier-1. Usuarios pueden experimentar latencia o errores intermitentes.'
        : 'Impacto limitado a entorno no productivo. Sin afectación a clientes finales.',
    affectedServices,
    rootCause,
    rootCauseConfidence,
    remediation,
    relatedAlerts,
    runbook: {
      id: 'rb-remediate-compute',
      name: record.signals.some((s) => s.kind === 'memory') ? 'OOMKilled — scale-up memoria' : 'Degradación compute — diagnóstico',
      route: '/runbooks',
    },
    timeline,
    sloImpact,
    escalationLevel: record.severity === 'critical' ? 'Nivel 2 · Guardia SRE' : 'Nivel 1 · Oncall',
    nextReview: `En ${record.severity === 'critical' ? '15' : '30'} min`,
  }
}

export const instanceProviderTypeLabel = (provider: string): string => {
  const p = provider.toUpperCase()
  if (p === 'AWS') return 'EC2'
  if (p === 'GCP') return 'GCE'
  if (p === 'AZURE') return 'VM'
  if (p === 'VPS') return 'VPS'
  return 'Instancia'
}

export const buildInstanceHealthRecord = (row: DashboardInstanceRow): InstanceHealthRecord => {
  const trend = buildInstanceTrendChart(row)
  const cpu = trend.cpuPeak
  const ram = trend.ramPeak
  const disk = diskUsageFor(row)
  const signals = buildSignals(row, cpu, ram, disk)
  const severity = resolveSeverity(row, signals)
  const alertsActive = instanceAlerts(row).length

  const base: InstanceHealthRecord = {
    id: row.id,
    name: row.name,
    provider: row.provider,
    logo: instanceProviderLogo(row.provider) ?? (row.isVps ? undefined : instanceProviderLogo(row.provider)),
    resourceType: instanceProviderTypeLabel(row.provider),
    region: row.region ?? '—',
    instanceType: row.instanceType ?? '—',
    status: row.status ?? 'RUNNING',
    severity,
    healthScore: computeScore(severity, cpu, ram, disk, alertsActive),
    cpuPercent: cpu,
    ramPercent: ram,
    diskPercent: disk,
    alertsActive,
    signals,
    primaryIssue: primaryIssueFor(signals, severity),
    recommendation: recommendationFor(signals, row),
    duration: severity === 'healthy' ? '—' : durationFor(severity, row.id),
    lastCheck: ts(seed(row.id) % 45),
    route: '/instances/all-instances',
    environment: row.environment ?? 'production',
    accountName: row.accountName ?? row.provider.toLowerCase(),
    os: row.os,
    publicIp: row.publicIp,
    privateIp: row.privateIp,
    vcpu: row.cpuCores,
    memoryGb: row.ramGb,
    diskGb: row.diskGb,
    monthlyCost: row.monthlyCost,
  }
  if (severity === 'healthy') return base
  return { ...base, incident: buildIncidentDetail(base) }
}

export const buildHealthRecordsFromInstances = (instances: Instance[]): InstanceHealthRecord[] =>
  instances.map((inst) => buildInstanceHealthRecord(instanceToDashboardRow(inst)))

/** Centro de salud: solo instancias con incidencia activa (crítica o advertencia). */
export const isHealthCenterSeverity = (severity: InstanceHealthSeverity): boolean =>
  severity === 'critical' || severity === 'warning'

export const filterHealthCenterRecords = (records: InstanceHealthRecord[]): InstanceHealthRecord[] =>
  records.filter((r) => isHealthCenterSeverity(r.severity))

export const summarizeHealth = (records: InstanceHealthRecord[]): HealthSummary => {
  const total = records.length
  const healthy = records.filter((r) => r.severity === 'healthy').length
  const warning = records.filter((r) => r.severity === 'warning').length
  const critical = records.filter((r) => r.severity === 'critical').length
  const down = records.filter((r) => r.severity === 'down').length
  const avgScore = total
    ? Math.round(records.reduce((s, r) => s + r.healthScore, 0) / total)
    : 0
  const slaPct = total ? Math.round(((healthy + warning * 0.5) / total) * 100) : 100
  const alertsOpen = records.reduce((s, r) => s + r.alertsActive, 0)

  return { total, healthy, warning, critical, down, avgScore, slaPct, alertsOpen }
}

export const healthSeverityBuckets = (summary: HealthSummary): HealthSeverityBucket[] => {
  const total = summary.total || 1
  return [
    {
      key: 'healthy',
      label: 'Sanas',
      count: summary.healthy,
      pct: Math.round((summary.healthy / total) * 100),
      icon: 'check_circle',
      tone: 'ok',
      description: 'Métricas dentro de umbral · sin alertas',
    },
    {
      key: 'warning',
      label: 'Advertencia',
      count: summary.warning,
      pct: Math.round((summary.warning / total) * 100),
      icon: 'warning',
      tone: 'warn',
      description: 'CPU, RAM, disco o latencia fuera de objetivo',
    },
    {
      key: 'critical',
      label: 'Críticas',
      count: summary.critical,
      pct: Math.round((summary.critical / total) * 100),
      icon: 'error',
      tone: 'crit',
      description: 'Requiere acción inmediata · riesgo de caída',
    },
    {
      key: 'down',
      label: 'Detenidas',
      count: summary.down,
      pct: Math.round((summary.down / total) * 100),
      icon: 'cloud_off',
      tone: 'down',
      description: 'Instancia apagada o no disponible',
    },
  ]
}

/** Buckets visibles en Centro de salud (solo críticas y advertencias). */
export const healthCenterSeverityBuckets = (summary: HealthSummary): HealthSeverityBucket[] =>
  healthSeverityBuckets(summary).filter((b) => b.key === 'critical' || b.key === 'warning')

export const healthByProvider = (records: InstanceHealthRecord[]): HealthProviderSummary[] => {
  const map = new Map<string, InstanceHealthRecord[]>()
  for (const r of records) {
    const list = map.get(r.provider) ?? []
    list.push(r)
    map.set(r.provider, list)
  }
  return [...map.entries()]
    .map(([provider, items]) => ({
      provider,
      logo: instanceProviderLogo(provider),
      total: items.length,
      healthy: items.filter((i) => i.severity === 'healthy').length,
      warning: items.filter((i) => i.severity === 'warning').length,
      critical: items.filter((i) => i.severity === 'critical').length,
      down: items.filter((i) => i.severity === 'down').length,
      avgScore: Math.round(items.reduce((s, i) => s + i.healthScore, 0) / items.length),
    }))
    .sort((a, b) => b.total - a.total)
}

const fmtCost = (v: number | null | undefined): string =>
  v != null
    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
    : '—'

export interface HealthDetailField {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
}

export interface HealthDetailSection {
  id: string
  title: string
  icon: string
  fields: HealthDetailField[]
}

export interface HealthMetadataGroup {
  id: string
  title: string
  icon: string
  entries: { key: string; value: string; mono?: boolean }[]
}

export const healthResourceSections = (record: InstanceHealthRecord): HealthDetailSection[] => [
  {
    id: 'identity',
    title: 'Identidad',
    icon: 'badge',
    fields: [
      { label: 'Resource ID', value: record.id, mono: true, copyable: true },
      { label: 'Resource name', value: record.name },
      { label: 'Resource type', value: `${record.resourceType} · ${record.instanceType}` },
      { label: 'Provider', value: record.provider },
      { label: 'Account', value: record.accountName },
      { label: 'Environment', value: record.environment },
    ],
  },
  {
    id: 'network',
    title: 'Red',
    icon: 'lan',
    fields: [
      { label: 'Region', value: record.region },
      { label: 'Private IP', value: record.privateIp ?? '—', mono: true },
      { label: 'Public IP', value: record.publicIp ?? '—', mono: true },
      { label: 'Runtime status', value: statusLabel(record.status) },
      { label: 'Last health check', value: record.lastCheck },
    ],
  },
  {
    id: 'compute',
    title: 'Compute',
    icon: 'memory',
    fields: [
      { label: 'Operating system', value: record.os ?? '—' },
      { label: 'vCPU', value: record.vcpu != null ? String(record.vcpu) : '—' },
      { label: 'Memory', value: record.memoryGb != null ? `${record.memoryGb} GB` : '—' },
      { label: 'Disk', value: record.diskGb != null ? `${record.diskGb} GB` : '—' },
      { label: 'Monthly cost', value: fmtCost(record.monthlyCost) },
    ],
  },
]

export const healthIncidentSection = (record: InstanceHealthRecord): HealthDetailSection => ({
  id: 'incident',
  title: 'Incidencia activa',
  icon: 'report',
  fields: [
    { label: 'Summary', value: record.primaryIssue },
    { label: 'Severity', value: severityLabel(record.severity) },
    { label: 'Health score', value: `${record.healthScore}%` },
    { label: 'Duration', value: record.duration },
    { label: 'Active alerts', value: String(record.alertsActive) },
    { label: 'Recommendation', value: record.recommendation },
  ],
})

export const healthMetadataGroups = (record: InstanceHealthRecord): HealthMetadataGroup[] => [
  {
    id: 'resource',
    title: 'Resource',
    icon: 'dns',
    entries: [
      { key: 'id', value: record.id, mono: true },
      { key: 'name', value: record.name },
      { key: 'type', value: record.resourceType },
      { key: 'provider', value: record.provider },
      { key: 'region', value: record.region },
      { key: 'account', value: record.accountName },
      { key: 'environment', value: record.environment },
    ],
  },
  {
    id: 'health',
    title: 'Health',
    icon: 'monitor_heart',
    entries: [
      { key: 'score', value: `${record.healthScore}%` },
      { key: 'severity', value: record.severity },
      { key: 'status', value: record.status },
      { key: 'lastCheck', value: record.lastCheck },
      { key: 'cpuPercent', value: `${record.cpuPercent}%` },
      { key: 'memoryPercent', value: `${record.ramPercent}%` },
      { key: 'diskPercent', value: `${record.diskPercent}%` },
    ],
  },
  {
    id: 'incident',
    title: 'Incident',
    icon: 'warning',
    entries: [
      { key: 'summary', value: record.primaryIssue },
      { key: 'duration', value: record.duration },
      { key: 'alertsActive', value: String(record.alertsActive) },
      { key: 'recommendation', value: record.recommendation },
    ],
  },
]

export const healthResourceDetailRows = (
  record: InstanceHealthRecord,
): { label: string; value: string }[] => [
  { label: 'Resource ID', value: record.id },
  { label: 'Resource name', value: record.name },
  { label: 'Resource type', value: `${record.resourceType} · ${record.instanceType}` },
  { label: 'Provider', value: record.provider },
  { label: 'Region', value: record.region },
  { label: 'Account', value: record.accountName },
  { label: 'Environment', value: record.environment },
  { label: 'Operating system', value: record.os ?? '—' },
  { label: 'Private IP', value: record.privateIp ?? '—' },
  { label: 'Public IP', value: record.publicIp ?? '—' },
  { label: 'Compute', value: `${record.vcpu ?? '—'} vCPU · ${record.memoryGb ?? '—'} GB RAM · ${record.diskGb ?? '—'} GB disk` },
  { label: 'Monthly cost', value: fmtCost(record.monthlyCost) },
  { label: 'Runtime status', value: statusLabel(record.status) },
  { label: 'Last health check', value: record.lastCheck },
]

export const healthIncidentDetailRows = (
  record: InstanceHealthRecord,
): { label: string; value: string }[] => [
  { label: 'Incident', value: record.primaryIssue },
  { label: 'Severity', value: severityLabel(record.severity) },
  { label: 'Health score', value: `${record.healthScore}%` },
  { label: 'Duration', value: record.duration },
  { label: 'Active alerts', value: String(record.alertsActive) },
  { label: 'CPU usage', value: `${record.cpuPercent}%` },
  { label: 'Memory usage', value: `${record.ramPercent}%` },
  { label: 'Disk usage', value: `${record.diskPercent}%` },
  { label: 'Recommendation', value: record.recommendation },
]

export const buildHealthMetadataJson = (record: InstanceHealthRecord): string =>
  JSON.stringify(
    {
      resource: {
        id: record.id,
        name: record.name,
        type: record.resourceType,
        provider: record.provider,
        region: record.region,
        account: record.accountName,
        environment: record.environment,
        instanceType: record.instanceType,
        os: record.os ?? null,
        network: {
          privateIp: record.privateIp ?? null,
          publicIp: record.publicIp ?? null,
        },
        compute: {
          vcpu: record.vcpu ?? null,
          memoryGb: record.memoryGb ?? null,
          diskGb: record.diskGb ?? null,
        },
        cost: { monthlyUsd: record.monthlyCost ?? null },
      },
      health: {
        score: record.healthScore,
        severity: record.severity,
        status: record.status,
        lastCheck: record.lastCheck,
        metrics: {
          cpuPercent: record.cpuPercent,
          memoryPercent: record.ramPercent,
          diskPercent: record.diskPercent,
        },
      },
      incident: {
        summary: record.primaryIssue,
        duration: record.duration,
        alertsActive: record.alertsActive,
        recommendation: record.recommendation,
        findings: record.signals.map((s) => ({
          kind: s.kind,
          label: s.label,
          value: s.value,
          threshold: s.threshold,
          severity: s.severity,
          detail: s.detail,
        })),
      },
      links: { module: record.route },
    },
    null,
    2,
  )

export const buildHealthTimeline = (records: InstanceHealthRecord[]): HealthTimelineEvent[] => {
  const events: HealthTimelineEvent[] = []
  for (const r of records) {
    if (r.severity === 'healthy') continue
    for (const sig of r.signals.slice(0, 2)) {
      events.push({
        time: r.lastCheck,
        event: `${r.name}: ${sig.label} ${sig.value}`,
        severity: sig.severity === 'critical' || sig.severity === 'down' ? 'critical' : 'warning',
        instanceId: r.id,
      })
    }
  }
  return events.slice(0, 8)
}

export interface DonutSegment {
  color: string
  dash: number
  offset: number
}

export const buildDonutSegments = (summary: HealthSummary): DonutSegment[] => {
  const total = summary.total || 1
  const circumference = 301.59
  const parts = [
    { count: summary.healthy, color: '#10b981' },
    { count: summary.warning, color: '#f59e0b' },
    { count: summary.critical, color: '#ef4444' },
    { count: summary.down, color: '#64748b' },
  ]
  let offset = 0
  return parts.map(({ count, color }) => {
    const dash = (count / total) * circumference
    const seg = { color, dash, offset: -offset }
    offset += dash
    return seg
  })
}

/** Donut del Centro de salud: solo críticas y advertencias. */
export const buildHealthCenterDonutSegments = (summary: HealthSummary): DonutSegment[] => {
  const total = summary.total || 1
  const circumference = 301.59
  const parts = [
    { count: summary.warning, color: '#f59e0b' },
    { count: summary.critical, color: '#ef4444' },
  ]
  let offset = 0
  return parts.map(({ count, color }) => {
    const dash = (count / total) * circumference
    const seg = { color, dash, offset: -offset }
    offset += dash
    return seg
  })
}

export const severityLabel = (s: InstanceHealthSeverity | string): string => {
  const map: Record<string, string> = {
    healthy: 'Sana',
    warning: 'Advertencia',
    critical: 'Crítica',
    down: 'Detenida',
  }
  return map[s] ?? s
}

export const statusLabel = (s: string): string => {
  const map: Record<string, string> = {
    RUNNING: 'En ejecución',
    STOPPED: 'Detenida',
    WARNING: 'Advertencia',
    ERROR: 'Error',
  }
  return map[s] ?? s
}

