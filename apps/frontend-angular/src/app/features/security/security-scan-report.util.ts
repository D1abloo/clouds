import { securitySeverityLabel } from './security.config'
import type { SecurityRisk } from './security-center.data'

export interface SecurityScanReportTarget {
  provider: string
  category: string
  resource: string
  resourceType: string
  region: string
  check: string
}

export interface SecurityScanReportActivity {
  time: string
  message: string
  kind: 'info' | 'finding'
}

export interface SecurityScanReport {
  id: string
  completedAt: string
  scope: string
  providers: string[]
  categories: string[]
  minSeverity: string
  durationSeconds: number
  previousScore: number
  newScore: number
  scoreDelta: number
  resourcesScanned: number
  totalFindings: number
  newFindings: SecurityRisk[]
  targets: SecurityScanReportTarget[]
  activityLog: SecurityScanReportActivity[]
}

export const scanReportFilename = (report: SecurityScanReport, ext: 'json' | 'txt'): string => {
  const stamp = report.completedAt.slice(0, 10)
  return `informe-escaneo-${report.id}-${stamp}.${ext}`
}

export const buildScanReportText = (report: SecurityScanReport): string => {
  const lines = [
    '══════════════════════════════════════════════════════════════',
    '  INFORME DE ESCANEO DE SEGURIDAD · CloudOps',
    '══════════════════════════════════════════════════════════════',
    '',
    `ID del informe     : ${report.id}`,
    `Fecha de finalización : ${new Date(report.completedAt).toLocaleString('es-ES')}`,
    `Duración           : ${report.durationSeconds}s`,
    '',
    '--- Configuración del escaneo ---',
    `Alcance            : ${report.scope}`,
    `Proveedores        : ${report.providers.join(', ')}`,
    `Categorías         : ${report.categories.join(', ')}`,
    `Severidad mínima   : ${securitySeverityLabel(report.minSeverity)}`,
    '',
    '--- Resumen ejecutivo ---',
    `Recursos analizados : ${report.resourcesScanned}`,
    `Hallazgos totales   : ${report.totalFindings}`,
    `Nuevos hallazgos    : ${report.newFindings.length}`,
    `Puntuación anterior : ${report.previousScore}/100`,
    `Nueva puntuación    : ${report.newScore}/100`,
    `Delta               : ${report.scoreDelta > 0 ? '+' : ''}${report.scoreDelta} pts`,
    '',
    '--- Objetivos escaneados ---',
  ]

  if (report.targets.length) {
    report.targets.forEach((t, i) => {
      lines.push(
        `${i + 1}. ${t.resource} (${t.provider} · ${t.category})`,
        `   Tipo: ${t.resourceType} · Región: ${t.region}`,
        `   Control: ${t.check}`,
        '',
      )
    })
  } else {
    lines.push('  (sin objetivos registrados)', '')
  }

  lines.push('--- Nuevos hallazgos ---')
  if (report.newFindings.length) {
    report.newFindings.forEach((f, i) => {
      lines.push(
        `${i + 1}. [${securitySeverityLabel(f.severity)}] ${f.finding}`,
        `   Recurso: ${f.resource} · ${f.provider} · ${f.region}`,
        `   Categoría: ${f.category}`,
        `   Recomendación: ${f.recommendation}`,
        '',
      )
    })
  } else {
    lines.push('  No se detectaron hallazgos nuevos.', '')
  }

  lines.push('--- Actividad del escaneo ---')
  ;[...report.activityLog].reverse().forEach((entry) => {
    const prefix = entry.kind === 'finding' ? '[HALLAZGO]' : '[INFO]'
    lines.push(`${entry.time} ${prefix} ${entry.message}`)
  })

  lines.push('', '[FIN DEL INFORME]')
  return lines.join('\n')
}
