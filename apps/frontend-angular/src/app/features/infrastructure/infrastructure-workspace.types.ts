import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export interface InfraOperation {
  id: string
  label: string
  icon: string
  description: string
  confirm?: string
  disabled?: boolean
  disabledReason?: string
}

export interface InfraHeaderAction {
  label: string
  icon: string
  primary?: boolean
}

export interface InfraQuickAction {
  label: string
  icon: string
}

export interface InfraContextChip {
  label: string
  icon?: string
  tone?: 'default' | 'ok' | 'warn' | 'crit'
}

export interface InfraField {
  label: string
  value: string
  mono?: boolean
}

export interface InfraMetric {
  label: string
  value: number
  tone?: 'ok' | 'warn' | 'crit'
}

export interface InfraResourceRow {
  id: string
  title: string
  subtitle?: string
  status: string
  fields: InfraField[]
  metrics?: InfraMetric[]
  tags?: string[]
  detail?: string
  sync?: string
  logs?: string
  operations?: InfraOperation[]
  providerLogo?: NavLogoKey
  hostId?: string
  hostName?: string
  hostIp?: string
  hostPortScan?: {
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
  }[]
}

export interface InfraTabConfig {
  id: string
  label: string
  searchPlaceholder?: string
  filters?: { key: string; label: string; options: string[] }[]
  rows: InfraResourceRow[]
  emptyMessage?: string
}

export interface InfraWorkspaceConfig {
  id: string
  icon: string
  title: string
  description: string
  logo?: NavLogoKey
  logos?: NavLogoKey[]
  headerActions: InfraHeaderAction[]
  contextChips?: InfraContextChip[]
  quickActions?: InfraQuickAction[]
  tabs: InfraTabConfig[]
  lastSync?: string
}
