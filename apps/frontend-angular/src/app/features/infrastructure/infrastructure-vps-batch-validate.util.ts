import type { VpsHostRow } from './infrastructure-workspace.builders'
import {
  buildValidateResultFromHost,
  hashSeed,
  type SshValidateCheck,
  type VpsCheckStatus,
} from './infrastructure-vps-operations.util'
import {
  csvEscape,
  downloadJsonFile,
  downloadTextFile,
  slugifyFilename,
  triggerBlobDownload,
} from './infrastructure-report-export.util'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type BatchValidateCheck = SshValidateCheck

export interface BatchValidateHostResult {
  hostId: string
  hostName: string
  hostIp: string
  provider: string
  location: string
  environment: string
  user: string
  port: string
  os: string
  status: VpsCheckStatus
  offline: boolean
  latencyMs: number
  checksOk: number
  checksWarn: number
  checksFail: number
  checksSummary: string
  checks: BatchValidateCheck[]
  failedChecks: string[]
  lastCheck: string
  lastSuccessfulLogin: string
  clientKeyName: string
  bastionHop: string | null
  recommendations: string[]
}

export interface BatchValidateReport {
  reportId: string
  generatedAt: string
  durationSec: number
  method: string
  scope: string
  policyVersion: string
  hostCount: number
  hostsScanned: number
  hostsOk: number
  hostsWarn: number
  hostsFail: number
  hostsOffline: number
  avgLatencyMs: number
  minLatencyMs: number
  maxLatencyMs: number
  p95LatencyMs: number
  totalChecks: number
  checksOk: number
  checksWarn: number
  checksFail: number
  failedHosts: BatchValidateHostResult[]
  hosts: BatchValidateHostResult[]
  recommendations: string[]
  complianceNotes: string[]
  executiveSummary: string
}

const isOffline = (host: VpsHostRow): boolean => {
  const status = String(host.status ?? '').toLowerCase()
  return status.includes('offline') || status.includes('disconnect') || status.includes('error')
}

const hostEnvironment = (host: VpsHostRow, index: number): string => {
  if (host.name.includes('prod')) return 'Producción'
  if (host.name.includes('staging')) return 'Staging'
  if (host.name.includes('dev')) return 'Desarrollo'
  return index % 3 === 0 ? 'Producción' : index % 3 === 1 ? 'Staging' : 'Desarrollo'
}

const applyHostOverrides = (
  host: VpsHostRow,
  index: number,
  base: ReturnType<typeof buildValidateResultFromHost>,
): { checks: BatchValidateCheck[]; overallStatus: VpsCheckStatus; offline: boolean } => {
  const offline = isOffline(host)

  if (offline) {
    const checks = base.checks.map((c) => ({
      ...c,
      status: 'fail' as const,
      detail:
        c.id === 'dns'
          ? `${host.host} no responde · NXDOMAIN o firewall`
          : 'Host offline · comprobación omitida',
      durationMs: 0,
    }))
    return { checks, overallStatus: 'fail', offline: true }
  }

  if (hashSeed(host.name) % 19 === 0) {
    const checks = base.checks.map((c) =>
      c.id === 'auth'
        ? { ...c, status: 'fail' as const, detail: 'Clave rechazada · permiso denegado (publickey)' }
        : c,
    )
    return {
      checks,
      overallStatus: 'fail',
      offline: false,
    }
  }

  if (hashSeed(host.host) % 13 === 0 && base.overallStatus === 'ok') {
    const checks = base.checks.map((c) =>
      c.id === 'tcp'
        ? { ...c, status: 'warn' as const, detail: 'Latencia elevada · reintentos=2 · jitter alto' }
        : c,
    )
    return {
      checks,
      overallStatus: 'warn',
      offline: false,
    }
  }

  return { checks: base.checks, overallStatus: base.overallStatus, offline: false }
}

const buildHostResult = (host: VpsHostRow, index: number): BatchValidateHostResult => {
  const base = buildValidateResultFromHost(host, index)
  const { checks, overallStatus, offline } = applyHostOverrides(host, index, base)

  const checksOk = checks.filter((c) => c.status === 'ok').length
  const checksWarn = checks.filter((c) => c.status === 'warn').length
  const checksFail = checks.filter((c) => c.status === 'fail').length

  return {
    hostId: host.id,
    hostName: host.name,
    hostIp: host.host,
    provider: host.provider ?? '—',
    location: host.location ?? '—',
    environment: hostEnvironment(host, index),
    user: base.user,
    port: base.port,
    os: base.os,
    status: overallStatus,
    offline,
    latencyMs: offline ? 0 : base.latencyMs,
    checksOk,
    checksWarn,
    checksFail,
    checksSummary: `${checksOk} ok · ${checksWarn} warn · ${checksFail} fail`,
    checks,
    failedChecks: checks.filter((c) => c.status === 'fail').map((c) => c.label),
    lastCheck: base.lastCheck,
    lastSuccessfulLogin: offline ? '—' : base.lastSuccessfulLogin,
    clientKeyName: base.clientKeyName,
    bastionHop: base.bastionHop,
    recommendations: base.recommendations,
  }
}

export const buildBatchValidateReport = (hosts: VpsHostRow[]): BatchValidateReport => {
  const scannedAt = new Date()
  const hostResults = hosts.map(buildHostResult)

  const onlineHosts = hostResults.filter((h) => !h.offline)
  const latencies = onlineHosts.map((h) => h.latencyMs).sort((a, b) => a - b)
  const avgLatencyMs = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0
  const minLatencyMs = latencies[0] ?? 0
  const maxLatencyMs = latencies[latencies.length - 1] ?? 0
  const p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)] ?? maxLatencyMs

  const hostsOk = hostResults.filter((h) => h.status === 'ok').length
  const hostsWarn = hostResults.filter((h) => h.status === 'warn').length
  const hostsFail = hostResults.filter((h) => h.status === 'fail').length
  const hostsOffline = hostResults.filter((h) => h.offline).length

  const checksOk = hostResults.reduce((acc, h) => acc + h.checksOk, 0)
  const checksWarn = hostResults.reduce((acc, h) => acc + h.checksWarn, 0)
  const checksFail = hostResults.reduce((acc, h) => acc + h.checksFail, 0)
  const totalChecks = checksOk + checksWarn + checksFail

  const failedHosts = hostResults.filter((h) => h.status === 'fail' || h.offline)

  const recommendations: string[] = []
  if (hostsOffline) {
    recommendations.push(
      `${hostsOffline} host(s) offline — revisar conectividad de red, firewall y estado del proveedor.`,
    )
  }
  if (hostsFail > hostsOffline) {
    recommendations.push(
      `${hostsFail - hostsOffline} host(s) con fallo de autenticación SSH — verificar authorized_keys y rotación de claves.`,
    )
  }
  if (hostsWarn) {
    recommendations.push(`${hostsWarn} host(s) con advertencias — latencia, sudo o puertos no estándar.`)
  }
  if (p95LatencyMs > 80) {
    recommendations.push(`P95 latencia SSH ${p95LatencyMs} ms — evaluar bastion regional o tuning TCP.`)
  }
  if (hostResults.some((h) => h.bastionHop)) {
    recommendations.push('Hosts con jump host: confirmar cadena bastion → destino en runbook de acceso.')
  }
  recommendations.push('Programar validación batch semanal y alertar en Slack #cloudops si hostsFail > 0.')
  recommendations.push('Sincronizar badges de estado del inventario con resultado de esta validación.')

  const executiveSummary =
    hostsFail > 0
      ? `Validación SSH sobre ${hosts.length} hosts: ${hostsFail} fallo(s)${hostsOffline ? ` (${hostsOffline} offline)` : ''}, ${hostsWarn} en revisión. Latencia media ${avgLatencyMs} ms.`
      : hostsWarn > 0
        ? `Validación SSH sobre ${hosts.length} hosts: acceso operativo con ${hostsWarn} host(s) en atención. Latencia media ${avgLatencyMs} ms · ${totalChecks} comprobaciones OK.`
        : `Validación SSH sobre ${hosts.length} hosts: cumplimiento total. ${totalChecks} comprobaciones correctas · latencia media ${avgLatencyMs} ms.`

  return {
    reportId: `SSH-VAL-${scannedAt.toISOString().slice(0, 10).replace(/-/g, '')}-${String(hosts.length).padStart(2, '0')}`,
    generatedAt: scannedAt.toLocaleString('es-ES'),
    durationSec: 12 + hosts.length * 4,
    method: 'Batch SSH-2.0 handshake + auth probe + shell test · agentless CloudOps',
    scope: `Inventario VPS completo · ${hosts.length} hosts registrados`,
    policyVersion: 'POL-SSH-ACC v3.1 · CIS 5.2 · ISO 27001 A.9.4',
    hostCount: hosts.length,
    hostsScanned: hosts.length - hostsOffline,
    hostsOk,
    hostsWarn,
    hostsFail,
    hostsOffline,
    avgLatencyMs,
    minLatencyMs,
    maxLatencyMs,
    p95LatencyMs,
    totalChecks,
    checksOk,
    checksWarn,
    checksFail,
    failedHosts: failedHosts.sort((a, b) => (a.offline === b.offline ? 0 : a.offline ? -1 : 1)),
    hosts: hostResults.sort((a, b) => {
      const order = { fail: 0, warn: 1, ok: 2 }
      return order[a.status] - order[b.status]
    }),
    recommendations,
    complianceNotes: [
      'POL-SSH-ACC: autenticación solo por clave pública ED25519',
      'CIS 5.2: PermitRootLogin no · MaxAuthTries 3',
      'Sesiones grabadas en auditd + bucket cloudops-audit (90 días)',
      'Rotación de claves: 90 días · excepciones con ticket Security',
    ],
    executiveSummary,
  }
}

export const buildBatchValidateFilename = (report: BatchValidateReport, ext: string): string =>
  `${slugifyFilename(report.reportId)}.${ext}`

export const exportBatchValidateCsv = (report: BatchValidateReport): string => {
  const header = [
    'host',
    'host_ip',
    'provider',
    'environment',
    'status',
    'offline',
    'latency_ms',
    'check_id',
    'check_label',
    'check_status',
    'check_detail',
    'check_duration_ms',
    'last_check',
  ]
  const rows = report.hosts.flatMap((host) =>
    host.checks.map((c) =>
      [
        host.hostName,
        host.hostIp,
        host.provider,
        host.environment,
        host.status,
        host.offline ? 'yes' : 'no',
        host.latencyMs,
        c.id,
        c.label,
        c.status,
        c.detail,
        c.durationMs,
        host.lastCheck,
      ]
        .map(csvEscape)
        .join(','),
    ),
  )
  const filename = buildBatchValidateFilename(report, 'csv')
  downloadTextFile([header.join(','), ...rows].join('\n'), filename, 'text/csv;charset=utf-8')
  return filename
}

export const exportBatchValidateJson = (report: BatchValidateReport): string => {
  const filename = buildBatchValidateFilename(report, 'json')
  downloadJsonFile(report, filename)
  return filename
}

export const exportBatchValidateMarkdown = (report: BatchValidateReport): string => {
  const lines = [
    `# Validación SSH batch · ${report.reportId}`,
    '',
    `- **Generado:** ${report.generatedAt}`,
    `- **Alcance:** ${report.scope}`,
    `- **Política:** ${report.policyVersion}`,
    `- **Resumen:** ${report.executiveSummary}`,
    '',
    '## KPIs',
    '',
    '| Hosts | OK | Warn | Fallo | Offline | Latencia media | P95 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    `| ${report.hostCount} | ${report.hostsOk} | ${report.hostsWarn} | ${report.hostsFail} | ${report.hostsOffline} | ${report.avgLatencyMs} ms | ${report.p95LatencyMs} ms |`,
    '',
    '## Hosts con fallo',
    '',
  ]

  if (!report.failedHosts.length) {
    lines.push('_Sin hosts en fallo._')
  } else {
    for (const h of report.failedHosts) {
      lines.push(`### ${h.hostName} (${h.hostIp}) · ${h.status}${h.offline ? ' · offline' : ''}`)
      lines.push(`Proveedor: ${h.provider} · ${h.environment} · ${h.checksSummary}`)
      for (const c of h.checks.filter((check) => check.status !== 'ok')) {
        lines.push(`- **[${c.status.toUpperCase()}]** ${c.label} — ${c.detail}`)
      }
      lines.push('')
    }
  }

  lines.push('## Detalle por host', '')
  for (const host of report.hosts) {
    lines.push(`### ${host.hostName} (${host.hostIp}) · ${host.status}`)
    lines.push(
      `${host.provider} · ${host.environment} · ${host.user}@${host.hostIp}:${host.port} · ${host.latencyMs} ms`,
    )
    for (const c of host.checks) {
      lines.push(`- [${c.status}] ${c.label} · ${c.detail} (${c.durationMs} ms)`)
    }
    lines.push('')
  }

  lines.push('## Recomendaciones', '')
  report.recommendations.forEach((r) => lines.push(`- ${r}`))

  const content = lines.join('\n')
  const filename = buildBatchValidateFilename(report, 'md')
  downloadTextFile(content, filename, 'text/markdown;charset=utf-8')
  return filename
}

export const exportBatchValidatePdf = (report: BatchValidateReport): string => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const margin = 12
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 30, 30)
  doc.text('Informe de validación SSH batch · flota VPS', margin, y)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(report.reportId, margin, y + 6)
  doc.text(report.generatedAt, 280, y + 6, { align: 'right' })
  y += 14

  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  const summaryLines = doc.splitTextToSize(report.executiveSummary, 270)
  doc.text(summaryLines, margin, y)
  y += summaryLines.length * 4 + 6

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [255, 153, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Hosts', 'OK', 'Warn', 'Fallo', 'Offline', 'Lat. media', 'P95', 'Comprobaciones']],
    body: [[
      String(report.hostCount),
      String(report.hostsOk),
      String(report.hostsWarn),
      String(report.hostsFail),
      String(report.hostsOffline),
      `${report.avgLatencyMs} ms`,
      `${report.p95LatencyMs} ms`,
      String(report.totalChecks),
    ]],
    margin: { left: margin, right: margin },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  y += 8

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 6, cellPadding: 1.5 },
    headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Host', 'IP', 'Estado', 'Offline', 'Latencia', 'Checks', 'Entorno', 'Proveedor']],
    body: report.hosts.map((h) => [
      h.hostName,
      h.hostIp,
      h.status.toUpperCase(),
      h.offline ? 'Sí' : 'No',
      h.offline ? '—' : `${h.latencyMs} ms`,
      h.checksSummary,
      h.environment,
      h.provider,
    ]),
    margin: { left: margin, right: margin },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30
  if (y > 170) {
    doc.addPage()
    y = 14
  }
  y += 8

  if (report.failedHosts.length) {
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      styles: { fontSize: 5.5, cellPadding: 1.2 },
      headStyles: { fillColor: [194, 65, 12], textColor: [255, 255, 255], fontStyle: 'bold' },
      head: [['Host', 'IP', 'Estado', 'Fallos', 'Último check']],
      body: report.failedHosts.slice(0, 20).map((h) => [
        h.hostName,
        h.hostIp,
        h.offline ? 'OFFLINE' : h.status.toUpperCase(),
        h.failedChecks.join('; ') || '—',
        h.lastCheck,
      ]),
      margin: { left: margin, right: margin },
    })
  }

  doc.setFontSize(7)
  doc.setTextColor(130, 130, 130)
  doc.text(
    `CloudOps · ${report.policyVersion} · Generado ${new Date().toLocaleString('es-ES')}`,
    margin,
    doc.internal.pageSize.getHeight() - 6,
  )

  const filename = buildBatchValidateFilename(report, 'pdf')
  triggerBlobDownload(doc.output('blob'), filename)
  return filename
}
