import type { PlatformModuleConfig, PlatformModuleTab } from '../../shared/platform/platform-module.models'
import type {
  InfraContextChip,
  InfraMetric,
  InfraResourceRow,
  InfraTabConfig,
  InfraWorkspaceConfig,
} from './infrastructure-workspace.types'
import { enrichInfraRows, resolveModuleLogos } from './infrastructure-row-enrichment'

import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

const providerFromRow = (row: Record<string, unknown>): NavLogoKey | undefined => {
  const value = String(row['provider'] ?? '').toLowerCase()
  if (value.includes('aws')) return 'aws'
  if (value.includes('gcp') || value.includes('google')) return 'gcp'
  if (value.includes('azure')) return 'azure'
  return undefined
}

const str = (value: unknown): string => (value == null || value === '' ? '—' : String(value))

const parsePercent = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  const parsed = Number(String(value).replace('%', '').trim())
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}

const formatDate = (value: unknown): string => {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return str(value)
  return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

const monoKeys = ['cidr', 'fingerprint', 'cron', 'subnet', 'id', 'unit', 'record', 'ip', 'host', 'mountpoint']

const buildDefaultDetail = (row: Record<string, unknown>, tab: PlatformModuleTab): string => {
  const name = str(row[tab.columns[0]?.key ?? 'name'])
  const status = str(row['status'] ?? row['state'] ?? 'activo')
  return `Recurso ${name} en la vista «${tab.label}». Estado operativo: ${status}. Gestión disponible: logs, métricas en vivo, acciones de mantenimiento y sincronización con el inventario cloud.`
}

const extractMetrics = (row: Record<string, unknown>): InfraMetric[] | undefined => {
  const metrics: InfraMetric[] = []
  const mapping: [string, string][] = [
    ['cpu', 'CPU'],
    ['ram', 'RAM'],
    ['disk', 'Disco'],
    ['used', 'Uso'],
  ]
  for (const [key, label] of mapping) {
    const value = parsePercent(row[key])
    if (value != null) metrics.push({ label, value })
  }
  return metrics.length ? metrics : undefined
}

const extractTags = (row: Record<string, unknown>): string[] | undefined => {
  const tags = ['provider', 'type', 'namespace', 'region', 'cluster', 'severity']
    .map((key) => row[key])
    .filter((value) => value != null && value !== '')
    .map(String)
  return tags.length ? tags : undefined
}

export const platformRowToInfraRow = (
  row: Record<string, unknown>,
  tab: PlatformModuleTab,
  index: number,
): InfraResourceRow => {
  const titleKey = tab.columns[0]?.key ?? 'name'
  const title = str(row[titleKey] ?? row['name'] ?? row['id'] ?? `recurso-${index + 1}`)
  const status = str(row['status'] ?? row['state'] ?? row['severity'] ?? 'activo')

  const fields = tab.columns
    .filter((column) => column.key !== titleKey && column.type !== 'status')
    .map((column) => ({
      label: column.label,
      value:
        column.type === 'date'
          ? formatDate(row[column.key])
          : str(row[column.key]),
      mono: monoKeys.some((key) => column.key.toLowerCase().includes(key)),
    }))

  const subtitleParts = [row['vpc'], row['cluster'], row['host'], row['namespace'], row['source']]
    .map((part) => (part ? String(part) : ''))
    .filter(Boolean)

  return {
    id: str(row['id'] ?? row['name'] ?? row['record'] ?? `${tab.label}-${index}`),
    title,
    subtitle: subtitleParts[0],
    status,
    fields,
    metrics: extractMetrics(row),
    tags: extractTags(row),
    detail: str(row['detail'] ?? row['message'] ?? buildDefaultDetail(row, tab)),
    sync: row['sync'] ? str(row['sync']) : row['createdAt'] ? `Actualizado ${formatDate(row['createdAt'])}` : undefined,
    providerLogo: providerFromRow(row),
  }
}

const buildContextChips = (config: PlatformModuleConfig): InfraContextChip[] => {
  const rows = config.tabs.flatMap((tab) => tab.rows)
  const alerts = rows.filter((row) => {
    const status = String(row['status'] ?? row['severity'] ?? '').toLowerCase()
    return status.includes('warn') || status.includes('fail') || status.includes('crit')
  }).length

  return [
    { label: `${rows.length} recursos inventariados`, icon: 'inventory_2' },
    { label: `${config.tabs.length} vistas operativas`, icon: 'view_list' },
    ...(alerts
      ? [{ label: `${alerts} requieren atención`, icon: 'warning', tone: 'warn' as const }]
      : [{ label: 'Inventario sincronizado', icon: 'cloud_done', tone: 'ok' as const }]),
  ]
}

export const platformTabToInfraTab = (tab: PlatformModuleTab, moduleId: string): InfraTabConfig => {
  const tabId = tab.label.toLowerCase().replace(/[^\w]+/g, '-')
  return {
    id: tabId,
    label: tab.label,
    searchPlaceholder: tab.searchPlaceholder,
    filters: tab.filters?.map((filter) => ({
      ...filter,
      options: filter.options.filter((option) => option !== ''),
    })),
    rows: enrichInfraRows(
      tab.rows.map((row, index) => platformRowToInfraRow(row, tab, index)),
      { moduleId, tabId },
    ),
    emptyMessage: tab.emptyMessage,
  }
}

export const platformConfigToWorkspace = (config: PlatformModuleConfig): InfraWorkspaceConfig => {
  const branding = resolveModuleLogos(config.id)
  return {
    id: config.id,
    icon: config.icon,
    title: config.title,
    description: config.description,
    ...branding,
    headerActions: config.headerActions.map((action) => ({
      label: action.label,
      icon: action.icon ?? 'bolt',
      primary: action.primary,
    })),
    quickActions: config.quickActions,
    contextChips: buildContextChips(config),
    lastSync: 'hace 2 min',
    tabs: config.tabs.map((tab) => platformTabToInfraTab(tab, config.id)),
  }
}
