import { ResourceStatus } from '../../core/models/api.models'

export const normalizeStatus = (raw?: string): ResourceStatus => {
  const value = (raw ?? 'unknown').toLowerCase()
  if (['running', 'active', 'online'].includes(value)) return 'running'
  if (['success', 'succeeded', 'passed', 'ok'].includes(value)) return 'applied'
  if (['stopped', 'inactive', 'offline', 'terminated', 'skipped'].includes(value))
    return 'stopped'
  if (['pending', 'starting', 'stopping', 'provisioning'].includes(value))
    return 'pending'
  if (['error', 'failed', 'failure'].includes(value)) return 'error'
  if (['warning', 'degraded', 'unstable'].includes(value)) return 'warning'
  return 'unknown'
}

export const statusLabel = (status: ResourceStatus): string => {
  const labels: Record<ResourceStatus, string> = {
    running: 'Running',
    stopped: 'Stopped',
    pending: 'Pending',
    applied: 'Success',
    error: 'Failed',
    warning: 'Unstable',
    unknown: 'Unknown',
  }
  return labels[status]
}
