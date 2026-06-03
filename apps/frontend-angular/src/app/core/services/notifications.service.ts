import { Injectable, inject } from '@angular/core'
import { Observable, map } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { NotificationItem } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'

type RawNotification = {
  id: string
  title: string
  body?: string
  message?: string
  isRead?: boolean
  read?: boolean
  createdAt: string
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiClientService)

  list = (): Observable<NotificationItem[]> =>
    this.api.get<unknown>('notifications').pipe(
      map((res) =>
        unwrapList<RawNotification>(res).map((n) => ({
          id: n.id,
          title: n.title,
          message: n.body ?? n.message ?? '',
          read: n.isRead ?? n.read ?? false,
          createdAt: n.createdAt,
        })),
      ),
    )

  markRead = (id: string): Observable<unknown> =>
    this.api.post(`notifications/${id}/read`)
}
