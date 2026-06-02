import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { DashboardStats } from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiClientService)

  getStats = (): Observable<DashboardStats> =>
    this.api.get<DashboardStats>('metrics/dashboard')
}
