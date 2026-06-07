import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import type {
  IntegrationConfigDto,
  IntegrationDeliveryDto,
  IntegrationPlatformSourceDto,
  IntegrationSourcesResponseDto,
  IntegrationTestResultDto,
  IntegrationsStatusDto,
} from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class IntegrationsService {
  private readonly api = inject(ApiClientService)

  getStatus(): Observable<IntegrationsStatusDto | null> {
    return this.api.get<IntegrationsStatusDto>('integrations/status').pipe(catchError(() => of(null)))
  }

  list(): Observable<IntegrationConfigDto[]> {
    return this.api.get<IntegrationConfigDto[]>('integrations').pipe(catchError(() => of([])))
  }

  update(
    id: string,
    body: { enabled?: boolean; status?: string; config?: Record<string, unknown>; events?: string[] },
  ): Observable<IntegrationConfigDto | null> {
    return this.api.patch<IntegrationConfigDto>(`integrations/${id}`, body).pipe(catchError(() => of(null)))
  }

  test(id: string): Observable<IntegrationTestResultDto | null> {
    return this.api.post<IntegrationTestResultDto>(`integrations/${id}/test`, {}).pipe(catchError(() => of(null)))
  }

  disconnect(id: string): Observable<IntegrationConfigDto | null> {
    return this.api.post<IntegrationConfigDto>(`integrations/${id}/disconnect`, {}).pipe(catchError(() => of(null)))
  }

  deliveries(limit = 20, integrationId?: string): Observable<IntegrationDeliveryDto[]> {
    const params: Record<string, string> = { limit: String(limit) }
    if (integrationId) params['integrationId'] = integrationId
    return this.api.get<IntegrationDeliveryDto[]>('integrations/deliveries', params).pipe(catchError(() => of([])))
  }

  listSources(): Observable<IntegrationPlatformSourceDto[]> {
    return this.api
      .get<IntegrationSourcesResponseDto>('integrations/sources')
      .pipe(
        catchError(() => of({ sources: [] })),
        map((res) => res.sources ?? []),
      )
  }
}
