import type { ChangeCloud, ChangeRequest, ChangeRisk, ChangeStatus, ChangeType } from './change-management.data'

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  standard: 'Estándar',
  normal: 'Normal',
  emergency: 'Emergencia',
}

export const CHANGE_STATUS_LABELS: Record<ChangeStatus, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente aprobación',
  approved: 'Aprobado',
  scheduled: 'Programado',
  in_progress: 'En ejecución',
  completed: 'Completado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  rejected: 'Rechazado',
}

export const CHANGE_RISK_LABELS: Record<ChangeRisk, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
}

export const CHANGE_CLOUD_LABELS: Record<ChangeCloud, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
}

export const OPEN_CHANGE_STATUSES: ChangeStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'in_progress',
]

export const HISTORY_CHANGE_STATUSES: ChangeStatus[] = [
  'completed',
  'failed',
  'cancelled',
  'rejected',
]

export const TERMINAL_CHANGE_STATUSES: ChangeStatus[] = [
  'completed',
  'failed',
  'cancelled',
  'rejected',
]

export const isChangeProcessable = (status: ChangeStatus): boolean =>
  !TERMINAL_CHANGE_STATUSES.includes(status)

export const canApproveChange = (chg: ChangeRequest): boolean =>
  chg.status === 'pending_approval' || chg.status === 'draft'

export const canExecuteChange = (chg: ChangeRequest): boolean =>
  chg.status === 'approved' || chg.status === 'scheduled'

export const canCancelChange = (chg: ChangeRequest): boolean =>
  !TERMINAL_CHANGE_STATUSES.includes(chg.status)
