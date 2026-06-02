import { ResourceStatus } from '../../core/models/api.models'

export const normalizeStatus = (raw?: string): ResourceStatus => {
  const value = (raw ?? 'unknown').toLowerCase()
  if (['running', 'active', 'online'].includes(value)) return 'running'
  if (['stopped', 'inactive', 'offline', 'terminated'].includes(value))
    return 'stopped'
  if (['pending', 'starting', 'stopping', 'provisioning'].includes(value))
    return 'pending'
  if (['error', 'failed'].includes(value)) return 'error'
  if (['warning', 'degraded'].includes(value)) return 'warning'
  return 'unknown'
}

export const statusLabel = (status: ResourceStatus): string => {
  const labels: Record<ResourceStatus, string> = {
    running: 'Running',
    stopped: 'Stopped',
    pending: 'Pending',
    error: 'Error',
    warning: 'Warning',
    unknown: 'Unknown',
  }
  return labels[status]
}
