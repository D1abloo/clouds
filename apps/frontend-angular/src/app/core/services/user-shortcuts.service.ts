import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'

export interface UserShortcutDto {
  id: string
  route: string
  label: string
  section?: string | null
  icon?: string | null
  position: number
  organizationId?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateUserShortcutPayload {
  route: string
  label: string
  section?: string
  icon?: string
  position?: number
  organizationId?: string
}

@Injectable({ providedIn: 'root' })
export class UserShortcutsService {
  private readonly api = inject(ApiClientService)

  list = (): Observable<UserShortcutDto[]> => this.api.get<UserShortcutDto[]>('user-shortcuts')

  add = (body: CreateUserShortcutPayload): Observable<UserShortcutDto> =>
    this.api.post<UserShortcutDto>('user-shortcuts', body)

  removeByRoute = (route: string): Observable<{ ok: boolean }> => {
    const encoded = encodeURIComponent(route.startsWith('/') ? route.slice(1) : route)
    return this.api.delete<{ ok: boolean }>(`user-shortcuts/route/${encoded}`)
  }
}
