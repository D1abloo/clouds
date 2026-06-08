import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { ProModeService } from './pro-mode.service'
import { NotificationItem } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'
import { demoNotifications } from '../demo/demo-fallback.data'
import { allowsDemoDataFrom } from '../utils/demo-runtime.util'
import { emptyNotifications } from '../demo/pro-empty.data'

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
  private readonly pro = inject(ProModeService)

  list = (): Observable<NotificationItem[]> =>
    this.api.get<unknown>('notifications').pipe(
      map((res) => {
        const mapped = unwrapList<RawNotification>(res).map((n) => ({
          id: n.id,
          title: n.title,
          message: n.body ?? n.message ?? '',
          read: n.isRead ?? n.read ?? false,
          createdAt: n.createdAt,
        }))
        if (mapped.length) return mapped
        return allowsDemoDataFrom(this.pro) ? demoNotifications() : emptyNotifications()
      }),
      catchError(() =>
        of(allowsDemoDataFrom(this.pro) ? demoNotifications() : emptyNotifications()),
      ),
    )

  markRead = (id: string): Observable<unknown> =>
    this.api.post(`notifications/${id}/read`)
}
