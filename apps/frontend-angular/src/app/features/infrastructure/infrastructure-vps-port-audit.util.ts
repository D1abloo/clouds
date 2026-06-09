import type { VpsHostRow } from './infrastructure-workspace.builders'
import { VPS_DEMO_PORTS } from './infrastructure.data'
import {
  buildPortScanReport,
  mapPortCatalog,
  scanPortsForHost,
  type PortScanRow,
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

type Row = Record<string, unknown>

export interface PortAuditViolation {
  id: string
  severity: 'warn' | 'crit'
  rule: string
  hostName: string
  hostIp: string
  port: number
  service: string
  exposure: string
  detail: string
  remediation: string
}

export interface PortAuditHostSummary {
  hostId: string
  hostName: string
  hostIp: string
  provider: string
  location: string
  environment: string
  status: string
  openPorts: number
  riskOk: number
  riskWarn: number
  riskCrit: number
  score: number
  health: 'ok' | 'warn' | 'crit'
  ports: PortScanRow[]
  findings: string[]
}

export interface PortAuditReport {
  reportId: string
  generatedAt: string
  durationSec: number
  method: string
  policyVersion: string
  scope: string
  hostCount: number
  hostsScanned: number
  hostsOffline: number
  portsScannedPerHost: number
  totalOpenPorts: number
  uniqueServices: number
  publicExposed: number
  riskOk: number
  riskWarn: number
  riskCrit: number
  violations: PortAuditViolation[]
  hosts: PortAuditHostSummary[]
  recommendations: string[]
  complianceNotes: string[]
  executiveSummary: string
}

const remapDemoHostRows = (rows: Row[], hosts: VpsHostRow[]): Row[] => {
  if (!hosts.length) return rows
  const unique = [...new Set(rows.map((row) => String(row['host'] ?? '')))]
  const alias = new Map(
    unique.map((name, index) => [name, hosts[index % hosts.length]?.name ?? name]),
  )
  return rows.map((row) => ({
    ...row,
    host: alias.get(String(row['host'] ?? '')) ?? row['host'],
  }))
}

const hostEnvironment = (host: VpsHostRow, index: number): string => {
  if (host.name.includes('prod')) return 'Producción'
  if (host.name.includes('staging')) return 'Staging'
  if (host.name.includes('dev')) return 'Desarrollo'
  return index % 3 === 0 ? 'Producción' : index % 3 === 1 ? 'Staging' : 'Desarrollo'
}

const buildViolations = (host: PortAuditHostSummary): PortAuditViolation[] => {
  const violations: PortAuditViolation[] = []
  for (const port of host.ports) {
    if (port.port === 22 && (port.exposure.includes('0.0.0.0') || port.risk === 'crit')) {
      violations.push({
        id: `${host.hostName}-ssh-public`,
        severity: 'crit',
        rule: 'POL-SSH-01',
        hostName: host.hostName,
        hostIp: host.hostIp,
        port: port.port,
        service: port.service,
        exposure: port.exposure,
        detail: 'SSH expuesto a Internet sin restricción de origen',
        remediation: 'Limitar a bastion/VPN; habilitar fail2ban y claves ED25519',
      })
    }
    if (port.port === 5432 && !port.exposure.toLowerCase().includes('privada')) {
      violations.push({
        id: `${host.hostName}-pg-${port.port}`,
        severity: 'crit',
        rule: 'POL-DB-02',
        hostName: host.hostName,
        hostIp: host.hostIp,
        port: port.port,
        service: port.service,
        exposure: port.exposure,
        detail: 'Base de datos accesible fuera de subred de aplicación',
        remediation: 'Bind a IP privada; security group solo desde app tier',
      })
    }
    if (port.risk === 'warn' || port.exposure.includes('0.0.0.0')) {
      violations.push({
        id: `${host.hostName}-${port.port}-warn`,
        severity: 'warn',
        rule: 'POL-EXP-03',
        hostName: host.hostName,
        hostIp: host.hostIp,
        port: port.port,
        service: port.service,
        exposure: port.exposure,
        detail: `Puerto ${port.port} (${port.service}) con exposición amplia: ${port.exposure}`,
        remediation: 'Documentar excepción o restringir CIDR en firewall',
      })
    }
  }
  return violations
}

const hostScore = (ports: PortScanRow[]): number => {
  if (!ports.length) return 100
  const penalty = ports.reduce((acc, p) => acc + (p.risk === 'crit' ? 25 : p.risk === 'warn' ? 12 : 2), 0)
  return Math.max(10, 100 - penalty)
}

export const buildPortAuditReport = (hosts: VpsHostRow[], portCatalog: Row[] = VPS_DEMO_PORTS): PortAuditReport => {
  const boundPorts = remapDemoHostRows(portCatalog, hosts)
  const scannedAt = new Date()

  const hostSummaries: PortAuditHostSummary[] = hosts.map((host, index) => {
    const catalogPorts = boundPorts.filter((p) => String(p['host']) === host.name)
    const ports = catalogPorts.length
      ? mapPortCatalog(catalogPorts, host.name)
      : scanPortsForHost(host.name)
    const scan = buildPortScanReport({ hostName: host.name, hostIp: host.host }, ports)
    const score = hostScore(ports)
    const health: PortAuditHostSummary['health'] =
      scan.riskCrit > 0 ? 'crit' : scan.riskWarn > 0 ? 'warn' : 'ok'

    return {
      hostId: host.id,
      hostName: host.name,
      hostIp: host.host,
      provider: host.provider ?? '—',
      location: host.location ?? '—',
      environment: hostEnvironment(host, index),
      status: host.status ?? 'connected',
      openPorts: scan.openCount,
      riskOk: scan.riskOk,
      riskWarn: scan.riskWarn,
      riskCrit: scan.riskCrit,
      score,
      health,
      ports,
      findings: scan.warnings.slice(0, 4),
    }
  })

  const violations = hostSummaries.flatMap(buildViolations)
  const uniqueViolations = violations.filter(
    (v, i, arr) => arr.findIndex((x) => x.id === v.id) === i,
  )

  const allPorts = hostSummaries.flatMap((h) => h.ports)
  const riskOk = allPorts.filter((p) => p.risk === 'ok').length
  const riskWarn = allPorts.filter((p) => p.risk === 'warn').length
  const riskCrit = allPorts.filter((p) => p.risk === 'crit').length
  const publicExposed = allPorts.filter(
    (p) => p.exposure.includes('0.0.0.0') || p.exposure.toLowerCase().includes('público'),
  ).length

  const hostsOffline = hostSummaries.filter((h) => String(h.status).includes('offline') || String(h.status).includes('disconnect')).length
  const critHosts = hostSummaries.filter((h) => h.health === 'crit').length
  const warnHosts = hostSummaries.filter((h) => h.health === 'warn').length

  const recommendations: string[] = []
  if (uniqueViolations.some((v) => v.rule === 'POL-SSH-01')) {
    recommendations.push('Centralizar acceso SSH en bastion; eliminar 0.0.0.0/0 en puerto 22.')
  }
  if (publicExposed > 2) {
    recommendations.push(`${publicExposed} servicios con exposición pública — revisar mapa de ataque.`)
  }
  if (critHosts) {
    recommendations.push(`${critHosts} host(s) con hallazgos críticos requieren ticket prioritario.`)
  }
  recommendations.push('Programar auditoría semanal automatizada y comparar diff con informe anterior.')
  recommendations.push('Sincronizar reglas ufw/nftables con política POL-EXP-03 en change management.')

  const executiveSummary =
    critHosts > 0
      ? `Auditoría sobre ${hosts.length} hosts: ${critHosts} crítico(s), ${warnHosts} en revisión. ${uniqueViolations.length} violaciones de política detectadas.`
      : warnHosts > 0
        ? `Auditoría sobre ${hosts.length} hosts: superficie controlada con ${warnHosts} host(s) en atención y ${publicExposed} exposición(es) pública(s) documentada(s).`
        : `Auditoría sobre ${hosts.length} hosts: cumplimiento alto. ${allPorts.length} puertos abiertos auditados sin violaciones críticas.`

  return {
    reportId: `PORT-AUD-${scannedAt.toISOString().slice(0, 10).replace(/-/g, '')}-${String(hosts.length).padStart(2, '0')}`,
    generatedAt: scannedAt.toLocaleString('es-ES'),
    durationSec: 18 + hosts.length * 6,
    method: 'SYN stealth + ss -tulpn remoto + comparación política CloudOps',
    policyVersion: 'POL-VPS-NET v2.4 · CIS 5.2 · PCI 1.2.1',
    scope: `Inventario VPS completo · ${hosts.length} hosts registrados`,
    hostCount: hosts.length,
    hostsScanned: hosts.length - hostsOffline,
    hostsOffline,
    portsScannedPerHost: 1024,
    totalOpenPorts: allPorts.filter((p) => p.status !== 'closed').length,
    uniqueServices: new Set(allPorts.map((p) => p.service)).size,
    publicExposed,
    riskOk,
    riskWarn,
    riskCrit,
    violations: uniqueViolations,
    hosts: hostSummaries.sort((a, b) => a.score - b.score),
    recommendations,
    complianceNotes: [
      'CIS Benchmark 5.2: servicios mínimos expuestos',
      'PCI-DSS 1.2.1: segmentación de red verificada',
      'Política interna POL-EXP-03: excepciones requieren aprobación Security',
      'Retención de informes: 12 meses en bucket audit-cloudops',
    ],
    executiveSummary,
  }
}

export const buildPortAuditFilename = (report: PortAuditReport, ext: string): string =>
  `${slugifyFilename(report.reportId)}.${ext}`

export const exportPortAuditCsv = (report: PortAuditReport): string => {
  const header = [
    'host',
    'host_ip',
    'provider',
    'environment',
    'port',
    'protocol',
    'service',
    'process',
    'exposure',
    'firewall',
    'risk',
    'response_ms',
    'banner',
  ]
  const rows = report.hosts.flatMap((host) =>
    host.ports.map((p) =>
      [
        host.hostName,
        host.hostIp,
        host.provider,
        host.environment,
        p.port,
        p.protocol,
        p.service,
        p.process,
        p.exposure,
        p.firewall,
        p.risk,
        p.responseMs,
        p.banner,
      ]
        .map(csvEscape)
        .join(','),
    ),
  )
  const filename = buildPortAuditFilename(report, 'csv')
  downloadTextFile([header.join(','), ...rows].join('\n'), filename, 'text/csv;charset=utf-8')
  return filename
}

export const exportPortAuditJson = (report: PortAuditReport): string => {
  const filename = buildPortAuditFilename(report, 'json')
  downloadJsonFile(report, filename)
  return filename
}

export const exportPortAuditMarkdown = (report: PortAuditReport): string => {
  const lines = [
    `# Auditoría de puertos · ${report.reportId}`,
    '',
    `- **Generado:** ${report.generatedAt}`,
    `- **Alcance:** ${report.scope}`,
    `- **Política:** ${report.policyVersion}`,
    `- **Resumen:** ${report.executiveSummary}`,
    '',
    '## KPIs',
    '',
    `| Hosts | Escaneados | Puertos abiertos | Violaciones | Públicos |`,
    `| --- | --- | --- | --- | --- |`,
    `| ${report.hostCount} | ${report.hostsScanned} | ${report.totalOpenPorts} | ${report.violations.length} | ${report.publicExposed} |`,
    '',
    '## Violaciones de política',
    '',
  ]

  if (!report.violations.length) {
    lines.push('_Sin violaciones críticas._')
  } else {
    for (const v of report.violations) {
      lines.push(`- **[${v.severity.toUpperCase()}] ${v.rule}** · ${v.hostName}:${v.port} (${v.service}) — ${v.detail}`)
      lines.push(`  - Remediación: ${v.remediation}`)
    }
  }

  lines.push('', '## Detalle por host', '')
  for (const host of report.hosts) {
    lines.push(`### ${host.hostName} (${host.hostIp}) · score ${host.score}/100`)
    lines.push(`Proveedor: ${host.provider} · ${host.environment} · ${host.openPorts} puertos abiertos`)
    for (const p of host.ports) {
      lines.push(`- ${p.port}/${p.protocol} ${p.service} · ${p.exposure} · **${p.risk}**`)
    }
    lines.push('')
  }

  lines.push('## Recomendaciones', '')
  report.recommendations.forEach((r) => lines.push(`- ${r}`))

  const content = lines.join('\n')
  const filename = buildPortAuditFilename(report, 'md')
  downloadTextFile(content, filename, 'text/markdown;charset=utf-8')
  return filename
}

export const exportPortAuditPdf = (report: PortAuditReport): string => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const margin = 12
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 30, 30)
  doc.text('Informe de auditoría de puertos VPS', margin, y)

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
    head: [['Hosts', 'Escaneados', 'Abiertos', 'Violaciones', 'OK', 'Warn', 'Crit', 'Públicos']],
    body: [[
      String(report.hostCount),
      String(report.hostsScanned),
      String(report.totalOpenPorts),
      String(report.violations.length),
      String(report.riskOk),
      String(report.riskWarn),
      String(report.riskCrit),
      String(report.publicExposed),
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
    head: [['Host', 'IP', 'Score', 'Abiertos', 'Warn', 'Crit', 'Entorno', 'Proveedor']],
    body: report.hosts.map((h) => [
      h.hostName,
      h.hostIp,
      `${h.score}/100`,
      String(h.openPorts),
      String(h.riskWarn),
      String(h.riskCrit),
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

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 5.5, cellPadding: 1.2 },
    headStyles: { fillColor: [194, 65, 12], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Severidad', 'Regla', 'Host', 'Puerto', 'Servicio', 'Detalle']],
    body: report.violations.slice(0, 24).map((v) => [
      v.severity.toUpperCase(),
      v.rule,
      v.hostName,
      String(v.port),
      v.service,
      v.detail,
    ]),
    margin: { left: margin, right: margin },
  })

  doc.setFontSize(7)
  doc.setTextColor(130, 130, 130)
  doc.text(
    `CloudOps · ${report.policyVersion} · Generado ${new Date().toLocaleString('es-ES')}`,
    margin,
    doc.internal.pageSize.getHeight() - 6,
  )

  const filename = buildPortAuditFilename(report, 'pdf')
  triggerBlobDownload(doc.output('blob'), filename)
  return filename
}

export const buildPortScanFilename = (report: import('./infrastructure-vps-operations.util').PortScanReport, ext: string): string =>
  `${slugifyFilename(`scan-${report.hostName}`)}.${ext}`

export const exportPortScanCsv = (report: import('./infrastructure-vps-operations.util').PortScanReport): string => {
  const header = ['port', 'protocol', 'service', 'process', 'exposure', 'firewall', 'risk', 'response_ms', 'banner', 'status']
  const rows = report.ports.map((p) =>
    [p.port, p.protocol, p.service, p.process, p.exposure, p.firewall, p.risk, p.responseMs, p.banner, p.status]
      .map(csvEscape)
      .join(','),
  )
  const filename = buildPortScanFilename(report, 'csv')
  downloadTextFile([header.join(','), ...rows].join('\n'), filename, 'text/csv;charset=utf-8')
  return filename
}

export const exportPortScanJson = (report: import('./infrastructure-vps-operations.util').PortScanReport): string => {
  const filename = buildPortScanFilename(report, 'json')
  downloadJsonFile(report, filename)
  return filename
}

export const exportPortScanPdf = (report: import('./infrastructure-vps-operations.util').PortScanReport): string => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 14
  let y = 16

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`Escaneo de puertos · ${report.hostName}`, margin, y)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`${report.hostIp} · ${report.scannedAt}`, margin, y + 6)
  y += 14

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 8 },
    head: [['Abiertos', 'Filtrados', 'OK', 'Warn', 'Crit']],
    body: [[
      String(report.openCount),
      String(report.filteredCount),
      String(report.riskOk),
      String(report.riskWarn),
      String(report.riskCrit),
    ]],
    margin: { left: margin, right: margin },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  y += 6

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [255, 153, 0], textColor: [255, 255, 255] },
    head: [['Puerto', 'Proto', 'Servicio', 'Exposición', 'Riesgo']],
    body: report.ports.map((p) => [String(p.port), p.protocol, p.service, p.exposure, p.risk]),
    margin: { left: margin, right: margin },
  })

  const filename = buildPortScanFilename(report, 'pdf')
  triggerBlobDownload(doc.output('blob'), filename)
  return filename
}
