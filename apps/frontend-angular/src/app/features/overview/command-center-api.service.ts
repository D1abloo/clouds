import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import { ApiClientService } from '../../core/services/api-client.service'
import type {
  CommandCenterActionResult,
  CommandCenterRecentApiRow,
  ExecuteActionPayload,
} from './command-center.types'
import type { CommandCenterActionDialogResult } from './command-center-action-dialog.component'
import type { CommandCenterQuickAction } from './overview-pages.demo'

const normalizeActionLabel = (action: string): string => action.toLowerCase()

export const quickActionToPayload = (qa: CommandCenterQuickAction): ExecuteActionPayload => ({
  type: qa.actionType,
  resource: qa.resource,
  region: qa.region,
  namespace: qa.namespace,
  replicas: qa.replicas,
  provider: qa.provider,
  jobName: qa.jobName,
})

export const dialogResultToPayload = (result: CommandCenterActionDialogResult): ExecuteActionPayload | null => {
  const label = normalizeActionLabel(result.action)

  if (label.includes('reiniciar instancia') || label.includes('restart')) {
    return { type: 'restart-instance', resource: result.resource, region: result.region, provider: result.provider }
  }
  if (label.includes('escalar') || label.includes('deployment') || label.includes('k8s')) {
    return {
      type: 'scale-deployment',
      resource: result.resource,
      region: result.region,
      namespace: 'checkout',
      replicas: 5,
      provider: result.provider,
    }
  }
  if (label.includes('plan terraform') || (label.includes('terraform') && label.includes('plan'))) {
    return { type: 'terraform-plan', resource: result.resource, region: result.region, provider: result.provider }
  }
  if (label.includes('jenkins') || label.includes('pipeline')) {
    return {
      type: 'jenkins-build',
      resource: result.resource,
      jobName: result.resource,
      region: result.region,
      provider: result.provider,
    }
  }
  if (label.includes('backup')) {
    return { type: 'vps-backup', resource: result.resource, region: result.region, provider: result.provider }
  }
  if (label.includes('sync') || label.includes('inventario')) {
    return { type: 'sync-inventory', resource: result.resource, region: result.region, provider: result.provider }
  }

  return null
}

@Injectable({ providedIn: 'root' })
export class CommandCenterApiService {
  private readonly api = inject(ApiClientService)

  execute = (payload: ExecuteActionPayload): Observable<CommandCenterActionResult> =>
    this.api.post<CommandCenterActionResult>('command-center/actions/execute', payload)

  recent = (limit = 20): Observable<CommandCenterRecentApiRow[]> =>
    this.api.get<{ data?: CommandCenterRecentApiRow[] } | CommandCenterRecentApiRow[]>(
      'command-center/actions/recent',
      { limit: String(limit) },
    ).pipe(
      map((res) => (Array.isArray(res) ? res : (res.data ?? []))),
      catchError(() => of([])),
    )
}
