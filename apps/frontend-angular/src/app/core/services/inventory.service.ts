import { Injectable, inject } from '@angular/core'
import { Observable, catchError, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { CloudProvider } from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly api = inject(ApiClientService)

  dashboard = (): Observable<Record<string, unknown>> =>
    this.api
      .get<Record<string, unknown>>('inventory/dashboard')
      .pipe(catchError((): Observable<Record<string, unknown>> => of(this.fallbackDashboard())))

  docker = (): Observable<Record<string, unknown>> =>
    this.api
      .get<Record<string, unknown>>('inventory/docker')
      .pipe(catchError((): Observable<Record<string, unknown>> => of({ hosts: 0, containers: 0, items: [] })))

  kubernetes = (): Observable<Record<string, unknown>> =>
    this.api
      .get<Record<string, unknown>>('inventory/kubernetes')
      .pipe(catchError((): Observable<Record<string, unknown>> => of({ clusters: 0, podItems: [] })))

  terraform = (): Observable<Record<string, unknown>> =>
    this.api
      .get<Record<string, unknown>>('inventory/terraform')
      .pipe(catchError((): Observable<Record<string, unknown>> => of({ workspaces: 0, items: [] })))

  jenkins = (): Observable<Record<string, unknown>> =>
    this.api
      .get<Record<string, unknown>>('inventory/jenkins')
      .pipe(catchError((): Observable<Record<string, unknown>> => of({ jobCount: 0, jobItems: [] })))

  provider = (p: CloudProvider): Observable<Record<string, unknown>> =>
    this.api
      .get<Record<string, unknown>>(`inventory/provider/${p}`)
      .pipe(catchError((): Observable<Record<string, unknown>> => of({ accounts: 0, instanceList: [] })))

  private fallbackDashboard = (): Record<string, unknown> => ({
    totalInstances: 0,
    runningInstances: 0,
    monthlySpend: 0,
    alertsOpen: 0,
    byProvider: {},
    byStatus: {},
    recentAlerts: [],
    recentActivity: [],
    notifications: [],
  })
}
