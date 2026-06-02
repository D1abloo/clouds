import { Injectable, inject, signal, computed } from '@angular/core'
import { Router } from '@angular/router'
import { tap, catchError, throwError } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { AuthUser, LoginResponse } from '../models/api.models'

const TOKEN_KEY = 'cloudops_access_token'
const USER_KEY = 'cloudops_user'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService)
  private readonly router = inject(Router)

  private readonly userSignal = signal<AuthUser | null>(readStoredUser())
  readonly user = this.userSignal.asReadonly()
  readonly isAuthenticated = computed(() => !!this.userSignal())

  login = (email: string, password: string) => {
    return this.api.post<LoginResponse>('auth/login', { email, password }).pipe(
      tap((res) => this.persistSession(res)),
      catchError((err) => throwError(() => err)),
    )
  }

  logout = (): void => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    this.userSignal.set(null)
    this.router.navigate(['/login'])
  }

  getToken = (): string | null => localStorage.getItem(TOKEN_KEY)

  private persistSession = (res: LoginResponse): void => {
    localStorage.setItem(TOKEN_KEY, res.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
    this.userSignal.set(res.user)
  }
}

const readStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}
