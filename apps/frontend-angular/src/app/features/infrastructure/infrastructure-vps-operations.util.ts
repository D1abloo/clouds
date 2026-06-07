import type { InfraResourceRow } from './infrastructure-workspace.types'
import { VPS_DEMO_PORTS, VPS_DEMO_SSH_KEYS } from './infrastructure.demo'
import type { VpsHostRow } from './infrastructure-workspace.builders'
import type { VpsAddDialogResult } from './vps-add.dialog'

type Row = Record<string, unknown>

export type VpsCheckStatus = 'ok' | 'warn' | 'fail'

export interface SshValidateCheck {
  id: string
  label: string
  status: VpsCheckStatus
  detail: string
  durationMs: number
}

export interface SshValidateResult {
  hostName: string
  hostIp: string
  user: string
  port: string
  os: string
  provider: string
  location: string
  sshVersion: string
  serverHostKey: string
  clientKeyName: string
  clientKeyFingerprint: string
  authMethod: string
  latencyMs: number
  jitterMs: number
  packetLoss: string
  mfaRequired: boolean
  bastionHop: string | null
  knownHostsMatch: boolean
  lastSuccessfulLogin: string
  sessionPolicy: string
  checks: SshValidateCheck[]
  recommendations: string[]
  lastCheck: string
  overallStatus: VpsCheckStatus
}

export interface Metric24hPoint {
  hour: string
  value: number
}

export interface Metric24hSeries {
  label: string
  unit: string
  current: number
  min: number
  avg: number
  peak: number
  p95: number
  threshold: number
  trend: 'up' | 'down' | 'stable'
  status: VpsCheckStatus
  points: Metric24hPoint[]
}

export interface Metrics24hReport {
  hostName: string
  hostIp: string
  collectedAt: string
  windowLabel: string
  interval: string
  agent: string
  uptime: string
  loadAvg: string
  networkInMbps: number
  networkOutMbps: number
  diskReadIops: number
  diskWriteIops: number
  swapUsedPct: number
  series: Metric24hSeries[]
  alerts: { severity: VpsCheckStatus; message: string }[]
}

export interface PortScanRow {
  port: number
  protocol: string
  service: string
  process: string
  banner: string
  exposure: string
  firewall: string
  status: string
  responseMs: number
  lastSeen: string
  risk: 'ok' | 'warn' | 'crit'
}

export interface PortScanReport {
  hostName: string
  hostIp: string
  scannedAt: string
  durationSec: number
  method: string
  portsScanned: number
  openCount: number
  filteredCount: number
  closedCount: number
  riskOk: number
  riskWarn: number
  riskCrit: number
  ports: PortScanRow[]
  warnings: string[]
  recommendations: string[]
  complianceNotes: string[]
}

const fieldValue = (row: InfraResourceRow, ...labels: string[]): string | undefined => {
  for (const label of labels) {
    const hit = row.fields.find((f) => f.label.toLowerCase().includes(label.toLowerCase()))
    if (hit?.value) return hit.value
  }
  return undefined
}

export const hashSeed = (value: string): number =>
  value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

const trendFromValues = (values: number[]): 'up' | 'down' | 'stable' => {
  const first = values.slice(0, 8).reduce((a, b) => a + b, 0) / 8
  const last = values.slice(-8).reduce((a, b) => a + b, 0) / 8
  const delta = last - first
  if (delta > 4) return 'up'
  if (delta < -4) return 'down'
  return 'stable'
}

const metricStatus = (value: number, threshold: number): VpsCheckStatus => {
  if (value >= threshold) return 'warn'
  if (value >= threshold - 10) return 'ok'
  return 'ok'
}

const enrichPortRow = (p: Row, hostName: string): PortScanRow => {
  const port = Number(p['port'])
  const service = String(p['service'])
  const exposure = String(p['exposure'])
  const status = String(p['status'])
  const seed = hashSeed(`${hostName}:${port}`)
  const isPublic = exposure.includes('0.0.0.0') || exposure.toLowerCase().includes('público')
  const risk: PortScanRow['risk'] =
    isPublic && port !== 443 ? 'warn' : status.includes('warn') ? 'warn' : port === 22 && isPublic ? 'crit' : 'ok'

  const processMap: Record<string, string> = {
    ssh: 'sshd',
    https: 'nginx',
    http: 'nginx',
    postgresql: 'postgres',
    'kubernetes-api': 'kube-apiserver',
  }

  const bannerMap: Record<string, string> = {
    ssh: 'OpenSSH_9.6p1 Ubuntu-3ubuntu13',
    https: 'TLS 1.3 · nginx/1.24.0',
    postgresql: 'PostgreSQL 16.2',
    'kubernetes-api': 'Kubernetes v1.29.2',
  }

  return {
    port,
    protocol: port === 443 || port === 6443 ? 'TCP/TLS' : 'TCP',
    service,
    process: String(p['process'] ?? processMap[service] ?? service),
    banner: String(p['banner'] ?? bannerMap[service] ?? `${service} probe OK`),
    exposure,
    firewall: String(
      p['firewall'] ??
        (isPublic ? 'Regla WAN permitida — revisar' : status.includes('warn') ? 'Política pendiente' : 'Aprobada · SG interno'),
    ),
    status,
    responseMs: 8 + (seed % 45),
    lastSeen: String(p['lastSeen'] ?? 'hace 6 h'),
    risk,
  }
}

export const mapPortCatalog = (rows: Row[], hostName = ''): PortScanRow[] =>
  rows.map((p) => enrichPortRow(p, hostName || String(p['host'] ?? '')))

export const attachVpsHostMeta = (
  rows: InfraResourceRow[],
  hosts: VpsHostRow[],
  portCatalog?: Row[],
): InfraResourceRow[] => {
  if (!hosts.length) return rows
  const byName = new Map(hosts.map((h) => [h.name, h]))
  return rows.map((row) => {
    if (row.hostId) {
      const host = hosts.find((h) => h.id === row.hostId) ?? byName.get(row.title)
      const hostPorts = portCatalog?.filter((p) => String(p['host']) === (host?.name ?? row.hostName)) ?? []
      return {
        ...row,
        hostName: row.hostName ?? host?.name,
        hostIp: row.hostIp ?? host?.host,
        hostPortScan: hostPorts.length ? mapPortCatalog(hostPorts, host?.name ?? row.hostName) : row.hostPortScan,
      }
    }
    const hostField = row.fields.find((f) => f.label === 'Host')?.value
    const candidate =
      row.hostName ??
      (hostField ? String(hostField) : null) ??
      (row.title.includes(':') ? row.title.split(':')[0] : null) ??
      row.subtitle ??
      row.title
    const host = byName.get(String(candidate))
    if (!host) return row
    const hostPorts = portCatalog?.filter((p) => String(p['host']) === host.name) ?? []
    return {
      ...row,
      hostId: host.id,
      hostName: host.name,
      hostIp: host.host,
      hostPortScan: hostPorts.length ? mapPortCatalog(hostPorts, host.name) : row.hostPortScan,
    }
  })
}

export const buildMetrics24h = (row: InfraResourceRow): Metric24hSeries[] => {
  const metrics = row.metrics?.length
    ? row.metrics
    : [
        { label: 'CPU', value: 35 },
        { label: 'RAM', value: 48 },
        { label: 'Disco', value: 62 },
      ]

  const thresholds: Record<string, number> = { CPU: 85, RAM: 90, Disco: 80, Red: 75 }

  return metrics.map((metric) => {
    const threshold = thresholds[metric.label] ?? 85
    const points = Array.from({ length: 24 }, (_, hour) => {
      const wave = Math.sin(hour / 2.8) * 14
      const drift = (hour % 6) * 2 - 4
      const value = Math.max(4, Math.min(98, Math.round(metric.value + wave + drift)))
      return { hour: `${hour.toString().padStart(2, '0')}:00`, value }
    })
    const values = points.map((p) => p.value)
    const sorted = [...values].sort((a, b) => a - b)
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? metric.value

    return {
      label: metric.label,
      unit: '%',
      current: metric.value,
      min: Math.min(...values),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      peak: Math.max(...values),
      p95,
      threshold,
      trend: trendFromValues(values),
      status: metricStatus(metric.value, threshold),
      points,
    }
  })
}

export const buildMetrics24hReport = (row: InfraResourceRow, host: { hostName: string; hostIp: string }): Metrics24hReport => {
  const series = buildMetrics24h(row)
  const seed = hashSeed(host.hostName)
  const cpu = series.find((s) => s.label === 'CPU')
  const ram = series.find((s) => s.label === 'RAM')
  const disk = series.find((s) => s.label === 'Disco')

  const alerts: Metrics24hReport['alerts'] = []
  if (cpu && cpu.current >= cpu.threshold - 5) {
    alerts.push({ severity: 'warn', message: `CPU al ${cpu.current}% — umbral configurado ${cpu.threshold}%` })
  }
  if (ram && ram.peak >= ram.threshold) {
    alerts.push({ severity: 'warn', message: `Pico RAM ${ram.peak}% superó umbral ${ram.threshold}% entre 02:00–06:00` })
  }
  if (disk && disk.trend === 'up') {
    alerts.push({ severity: 'ok', message: `Disco con tendencia al alza (+${disk.peak - disk.min}% en 24 h)` })
  }

  return {
    hostName: host.hostName,
    hostIp: host.hostIp,
    collectedAt: new Date().toLocaleString('es-ES'),
    windowLabel: 'Últimas 24 horas',
    interval: 'Muestreo cada 5 min · 288 puntos',
    agent: 'Agentless SSH + /proc · node_exporter remoto',
    uptime: fieldValue(row, 'uptime') ?? '99.97%',
    loadAvg: fieldValue(row, 'load') ?? '1.2 / 1.0 / 0.8',
    networkInMbps: 120 + (seed % 80),
    networkOutMbps: 45 + (seed % 35),
    diskReadIops: 1200 + (seed % 900),
    diskWriteIops: 280 + (seed % 220),
    swapUsedPct: 4 + (seed % 12),
    series,
    alerts,
  }
}

export const scanPortsForHost = (hostName: string): PortScanRow[] => {
  const fromDemo = VPS_DEMO_PORTS.filter((p) => p.host === hostName)
  if (fromDemo.length) return mapPortCatalog(fromDemo, hostName)

  return mapPortCatalog(
    [
      { host: hostName, port: 22, service: 'ssh', exposure: 'VPN 10.8.0.0/24', status: 'running' },
      { host: hostName, port: 80, service: 'http', exposure: 'Subred privada', status: 'running' },
      { host: hostName, port: 443, service: 'https', exposure: 'Público (LB)', status: 'running' },
      { host: hostName, port: 9100, service: 'node-exporter', exposure: 'Monitoring', status: 'running' },
    ],
    hostName,
  )
}

export const buildPortScanReport = (
  host: { hostName: string; hostIp: string },
  ports: PortScanRow[],
): PortScanReport => {
  const openCount = ports.filter((p) => p.status !== 'closed').length
  const riskWarn = ports.filter((p) => p.risk === 'warn').length
  const riskCrit = ports.filter((p) => p.risk === 'crit').length
  const riskOk = ports.length - riskWarn - riskCrit

  const warnings = ports
    .filter((p) => p.risk === 'warn' || p.risk === 'crit' || p.exposure.includes('0.0.0.0'))
    .map((p) => `Puerto ${p.port}/${p.protocol.split('/')[0]} (${p.service}) · ${p.exposure} · ${p.firewall}`)

  const recommendations: string[] = []
  if (ports.some((p) => p.port === 22 && p.exposure.includes('0.0.0.0'))) {
    recommendations.push('Restringir SSH (22) a bastion o VPN; deshabilitar acceso 0.0.0.0/0.')
  }
  if (ports.some((p) => p.port === 5432 && !p.exposure.toLowerCase().includes('privada'))) {
    recommendations.push('PostgreSQL no debe ser accesible fuera de la subred de aplicación.')
  }
  if (riskWarn + riskCrit === 0) {
    recommendations.push('Superficie de ataque acotada. Mantener escaneo semanal automatizado.')
  } else {
    recommendations.push('Revisar reglas del security group y firewall local (ufw/nftables).')
    recommendations.push('Documentar excepciones en el registro de cambios de red.')
  }

  return {
    hostName: host.hostName,
    hostIp: host.hostIp,
    scannedAt: new Date().toLocaleString('es-ES'),
    durationSec: 4 + (hashSeed(host.hostName) % 6),
    method: 'SYN stealth + banner grab + nmap-service-probes',
    portsScanned: 1024,
    openCount,
    filteredCount: 3 + (hashSeed(host.hostIp) % 5),
    closedCount: 1024 - openCount - 4,
    riskOk,
    riskWarn,
    riskCrit,
    ports,
    warnings,
    recommendations,
    complianceNotes: [
      'CIS Benchmark 5.2: servicios mínimos expuestos',
      'PCI-DSS 1.2.1: segmentación de red verificada (demo)',
      'Política interna: puertos >1024 requieren ticket de aprobación',
    ],
  }
}

export const buildValidateResult = (row: InfraResourceRow): SshValidateResult => {
  const userField = row.fields.find((f) => f.label.toLowerCase().includes('usuario'))
  const key = VPS_DEMO_SSH_KEYS[0]
  const legacyKey = VPS_DEMO_SSH_KEYS.find((k) => String(k.status).includes('warn'))
  const hostName = row.hostName ?? (row.title.includes(':') ? row.title.split(':')[0] : row.title)
  const hostIp = row.hostIp ?? row.subtitle ?? fieldValue(row, 'ip', 'host') ?? '—'
  const os = fieldValue(row, 'so') ?? 'Ubuntu 22.04 LTS'
  const provider = fieldValue(row, 'proveedor') ?? '—'
  const location = fieldValue(row, 'ubicación') ?? '—'
  const latencyMs = 38 + (hashSeed(hostName) % 40)
  const hasWarn = String(row.status).includes('warn') || String(row.status).includes('offline')

  const checks: SshValidateCheck[] = [
    { id: 'dns', label: 'Resolución DNS / IP alcanzable', status: 'ok', detail: `${hostIp} responde en capa 3`, durationMs: 12 },
    { id: 'tcp', label: 'Puerto SSH (22/TCP)', status: hasWarn ? 'warn' : 'ok', detail: hasWarn ? 'Latencia elevada · reintentos=1' : 'Conexión TCP establecida', durationMs: latencyMs - 8 },
    { id: 'handshake', label: 'Handshake SSH-2.0', status: 'ok', detail: 'OpenSSH_9.6p1 · cipher: chacha20-poly1305@openssh.com', durationMs: 45 },
    { id: 'hostkey', label: 'Verificación host key', status: 'ok', detail: 'Coincide con known_hosts (SHA256)', durationMs: 18 },
    { id: 'auth', label: 'Autenticación clave pública', status: 'ok', detail: `Clave ${key?.name ?? 'ops-team-ed25519'} aceptada`, durationMs: 120 },
    { id: 'shell', label: 'Shell interactivo', status: 'ok', detail: 'Comando test: echo OK → exit 0', durationMs: 85 },
    { id: 'sudo', label: 'Política sudo (NOPASSWD)', status: legacyKey ? 'warn' : 'ok', detail: legacyKey ? 'Usuario con sudo sin MFA' : 'Sin escalada requerida para healthcheck', durationMs: 32 },
    { id: 'audit', label: 'Registro auditoría', status: 'ok', detail: 'Sesión registrada en auditd + CloudOps', durationMs: 8 },
  ]

  const overallStatus: VpsCheckStatus = checks.some((c) => c.status === 'fail')
    ? 'fail'
    : checks.some((c) => c.status === 'warn')
      ? 'warn'
      : 'ok'

  const recommendations: string[] = []
  if (overallStatus === 'warn') {
    recommendations.push('Habilitar MFA en bastion para accesos administrativos.')
    recommendations.push('Rotar claves legacy marcadas como warning en el inventario SSH.')
  } else {
    recommendations.push('Acceso conforme a política. Próxima rotación de clave recomendada en 45 días.')
  }
  if (provider !== '—') {
    recommendations.push(`Etiquetar recurso en ${provider} con owner y entorno para trazabilidad.`)
  }

  return {
    hostName,
    hostIp,
    user: userField?.value ?? 'ubuntu',
    port: '22',
    os,
    provider,
    location,
    sshVersion: 'OpenSSH_9.6p1 Ubuntu-3ubuntu13.5',
    serverHostKey: 'SHA256:Nx8Kp2vR…m4Q9/host-key-demo',
    clientKeyName: String(key?.name ?? 'ops-team-ed25519'),
    clientKeyFingerprint: String(key?.fingerprint ?? 'SHA256:ab12…f9'),
    authMethod: 'Clave pública ED25519 · agent forwarding deshabilitado',
    latencyMs,
    jitterMs: 4 + (hashSeed(hostIp) % 9),
    packetLoss: '0%',
    mfaRequired: hostName.includes('bastion') || hostName.includes('prod'),
    bastionHop: hostName.includes('bastion') ? null : 'vps-bastion-01 (jump host)',
    knownHostsMatch: true,
    lastSuccessfulLogin: new Date(Date.now() - 1000 * 60 * (30 + (hashSeed(hostName) % 120))).toLocaleString('es-ES'),
    sessionPolicy: 'Timeout 15 min · MaxSessions 3 · PermitRootLogin no',
    checks,
    recommendations,
    lastCheck: new Date().toLocaleString('es-ES'),
    overallStatus,
  }
}

export const buildInfraRowFromAdd = (payload: VpsAddDialogResult, id: string): InfraResourceRow => ({
  id,
  title: payload.name,
  subtitle: payload.host,
  hostId: id,
  hostName: payload.name,
  hostIp: payload.host,
  status: 'connected',
  fields: [
    { label: 'IP / Host', value: payload.host, mono: true },
    { label: 'Usuario SSH', value: payload.user, mono: true },
    { label: 'SO', value: payload.os },
    { label: 'Proveedor', value: payload.provider },
    { label: 'Ubicación', value: payload.location },
    { label: 'Docker', value: payload.discoverDocker ? 'Discovery pendiente' : 'No' },
    { label: 'Kubernetes', value: payload.discoverKubernetes ? 'Discovery pendiente' : 'No' },
  ],
  metrics: [
    { label: 'CPU', value: 18 + (hashSeed(payload.name) % 40) },
    { label: 'RAM', value: 32 + (hashSeed(payload.host) % 35) },
    { label: 'Disco', value: 48 + (payload.port % 28) },
  ],
  tags: [payload.provider, payload.environment, ...payload.tags].filter(Boolean),
  detail: payload.description,
})

export const buildValidateResultFromAdd = (payload: VpsAddDialogResult): SshValidateResult => {
  const key = VPS_DEMO_SSH_KEYS.find((k) => k.name === payload.sshKeyName) ?? VPS_DEMO_SSH_KEYS[0]
  const latencyMs = 32 + (hashSeed(payload.name) % 45)
  const authLabels: Record<VpsAddDialogResult['authMethod'], string> = {
    'public-key': `Clave pública ED25519 · ${payload.sshKeyName}`,
    agent: 'SSH agent forwarding',
    password: 'Contraseña (no recomendado)',
  }

  const checks: SshValidateCheck[] = [
    { id: 'dns', label: 'Resolución DNS / IP alcanzable', status: 'ok', detail: `${payload.host} responde en capa 3`, durationMs: 14 },
    {
      id: 'tcp',
      label: `Puerto SSH (${payload.port}/TCP)`,
      status: payload.port === 22 ? 'ok' : 'warn',
      detail: payload.port === 22 ? 'Conexión TCP establecida' : 'Puerto no estándar · verificar firewall',
      durationMs: latencyMs - 10,
    },
    { id: 'handshake', label: 'Handshake SSH-2.0', status: 'ok', detail: 'OpenSSH_9.6p1 · cipher: chacha20-poly1305@openssh.com', durationMs: 42 },
    { id: 'hostkey', label: 'Verificación host key', status: 'ok', detail: 'Nueva clave · fingerprint almacenado en known_hosts', durationMs: 20 },
    {
      id: 'auth',
      label: 'Autenticación',
      status: payload.authMethod === 'password' ? 'warn' : 'ok',
      detail: payload.authMethod === 'password' ? 'Contraseña aceptada · migrar a clave pública' : `Clave ${payload.sshKeyName} aceptada`,
      durationMs: 110,
    },
    { id: 'shell', label: 'Shell interactivo', status: 'ok', detail: 'Comando test: echo OK → exit 0', durationMs: 78 },
    { id: 'sudo', label: 'Política sudo (NOPASSWD)', status: 'ok', detail: 'Sin escalada requerida para healthcheck', durationMs: 28 },
    { id: 'audit', label: 'Registro auditoría', status: 'ok', detail: 'Sesión de prueba registrada en CloudOps', durationMs: 6 },
  ]

  const overallStatus: VpsCheckStatus = checks.some((c) => c.status === 'fail')
    ? 'fail'
    : checks.some((c) => c.status === 'warn')
      ? 'warn'
      : 'ok'

  return {
    hostName: payload.name,
    hostIp: payload.host,
    user: payload.user,
    port: String(payload.port),
    os: payload.os,
    provider: payload.provider,
    location: payload.location,
    sshVersion: 'OpenSSH_9.6p1 Ubuntu-3ubuntu13.5',
    serverHostKey: 'SHA256:Nx8Kp2vR…m4Q9/host-key-demo',
    clientKeyName: String(key?.name ?? payload.sshKeyName),
    clientKeyFingerprint: String(key?.fingerprint ?? 'SHA256:ab12…f9'),
    authMethod: authLabels[payload.authMethod],
    latencyMs,
    jitterMs: 3 + (hashSeed(payload.host) % 8),
    packetLoss: '0%',
    mfaRequired: payload.environment === 'prod',
    bastionHop: payload.bastionHost || null,
    knownHostsMatch: false,
    lastSuccessfulLogin: new Date().toLocaleString('es-ES'),
    sessionPolicy: 'Timeout 15 min · MaxSessions 3 · PermitRootLogin no',
    checks,
    recommendations: [
      overallStatus === 'warn'
        ? 'Migrar autenticación por contraseña a clave pública ED25519.'
        : 'Acceso conforme a política. Host listo para discovery post-alta.',
      `Etiquetar recurso en ${payload.provider} con entorno ${payload.environment}.`,
    ],
    lastCheck: new Date().toLocaleString('es-ES'),
    overallStatus,
  }
}

export const buildValidateResultFromHost = (host: VpsHostRow, index = 0): SshValidateResult => {
  const row: InfraResourceRow = {
    id: host.id,
    title: host.name,
    subtitle: host.host,
    hostId: host.id,
    hostName: host.name,
    hostIp: host.host,
    status: host.status ?? 'connected',
    fields: [
      { label: 'IP / Host', value: host.host, mono: true },
      { label: 'Usuario SSH', value: host.user ?? 'ubuntu', mono: true },
      { label: 'SO', value: host.os ?? 'Ubuntu 22.04 LTS' },
      { label: 'Proveedor', value: host.provider ?? '—' },
      { label: 'Ubicación', value: host.location ?? '—' },
    ],
    metrics: [
      { label: 'CPU', value: host.cpu ?? 20 + (index * 7) % 40 },
      { label: 'RAM', value: host.ram ?? 30 + (index * 11) % 35 },
    ],
  }
  return buildValidateResult(row)
}

export const resolveVpsHost = (row: InfraResourceRow): { hostId?: string; hostName: string; hostIp: string } => {
  const hostName =
    row.hostName ??
    (row.title.includes(':') ? row.title.split(':')[0] : row.title)
  const hostIp =
    row.hostIp ??
    row.subtitle ??
    row.fields.find((f) => f.label.includes('IP'))?.value ??
    '—'
  return { hostId: row.hostId, hostName, hostIp }
}
