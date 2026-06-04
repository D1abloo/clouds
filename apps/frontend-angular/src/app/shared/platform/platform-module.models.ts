import type { PageHeaderAction } from '../components/page-header/page-header.component'

export type PlatformColumnType = 'text' | 'status' | 'date' | 'severity'

export interface PlatformColumn {
  key: string
  label: string
  type?: PlatformColumnType
}

export interface PlatformFilter {
  key: string
  label: string
  options: string[]
}

export interface PlatformChart {
  title: string
  subtitle?: string
  kind: 'bar' | 'donut' | 'line'
  data: { label: string; value: number; color?: string }[]
}

export interface PlatformModuleTab {
  label: string
  searchPlaceholder?: string
  filters?: PlatformFilter[]
  columns: PlatformColumn[]
  rows: Record<string, unknown>[]
  charts?: PlatformChart[]
  emptyMessage?: string
}

export interface PlatformSummaryCard {
  title: string
  value: string | number
  icon: string
  iconColor?: 'purple' | 'success' | 'warn' | 'cyan' | 'primary'
  trend?: string
}

export interface PlatformModuleConfig {
  id: string
  title: string
  description: string
  icon: string
  headerActions: PageHeaderAction[]
  summaryCards: PlatformSummaryCard[]
  tabs: PlatformModuleTab[]
  quickActions?: { label: string; icon: string }[]
}
