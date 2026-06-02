import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { NotificationItem } from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiClientService)

  list = (): Observable<NotificationItem[]> =>
    this.api.get<NotificationItem[]>('notifications')

  markRead = (id: string): Observable<unknown> =>
    this.api.post(`notifications/${id}/read`)
}
