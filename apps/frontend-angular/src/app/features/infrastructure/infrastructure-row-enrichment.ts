import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import type { InfraResourceRow } from './infrastructure-workspace.types'
import { resolveModuleOperations } from './infrastructure-module-ops.catalog'

export const MODULE_LOGOS: Record<string, NavLogoKey | NavLogoKey[]> = {
  docker: 'docker',
  kubernetes: 'kubernetes',
  vps: ['docker', 'kubernetes'],
  network: ['aws', 'gcp', 'azure'],
  storage: ['aws', 'gcp', 'azure'],
  backups: ['aws', 'gcp', 'azure'],
  'capacity-planner': ['aws', 'gcp', 'azure'],
}

export const resolveModuleLogos = (moduleId: string): { logo?: NavLogoKey; logos?: NavLogoKey[] } => {
  const entry = MODULE_LOGOS[moduleId]
  if (!entry) return {}
  if (Array.isArray(entry)) return { logos: entry }
  return { logo: entry }
}

const ts = (): string => new Date().toISOString().replace('T', ' ').slice(0, 19)

const baseLogs = (row: InfraResourceRow, moduleId: string): string => {
  const lines = [
    `[${ts()}Z] INFO  sync agent · inventario ${moduleId} actualizado`,
    `[${ts()}Z] INFO  ${row.title} · estado=${row.status}`,
  ]
  if (row.metrics?.length) {
    for (const m of row.metrics) {
      lines.push(`[${ts()}Z] METRIC ${m.label}=${m.value}% umbral=85%`)
    }
  }
  if (row.detail) {
    lines.push(`[${ts()}Z] NOTE  ${row.detail.slice(0, 120)}${row.detail.length > 120 ? '…' : ''}`)
  }
  lines.push(`[${ts()}Z] INFO  healthcheck OK · latencia 42ms`)
  return lines.join('\n')
}

const vpsOps = (row: InfraResourceRow) => [
  { id: 'ssh', label: 'Abrir SSH', icon: 'terminal', description: 'Conexión segura al host con auditoría de sesión.' },
  { id: 'validate', label: 'Validar acceso', icon: 'verified', description: 'Comprueba clave SSH, usuario y fingerprint.' },
  { id: 'metrics', label: 'Métricas 24h', icon: 'monitoring', description: 'CPU, RAM, disco e IOPS de las últimas 24 horas.' },
  { id: 'scan', label: 'Escanear puertos', icon: 'radar', description: 'Detecta servicios expuestos y reglas firewall.' },
]

export const enrichInfraRow = (
  row: InfraResourceRow,
  ctx: { moduleId: string; tabId: string },
): InfraResourceRow => ({
  ...row,
  logs: row.logs ?? baseLogs(row, ctx.moduleId),
  operations:
    row.operations ??
    (ctx.moduleId === 'vps'
      ? vpsOps(row)
      : resolveModuleOperations(ctx.moduleId, ctx.tabId, row)),
})

export const enrichInfraRows = (
  rows: InfraResourceRow[],
  ctx: { moduleId: string; tabId: string },
): InfraResourceRow[] => rows.map((row) => enrichInfraRow(row, ctx))
