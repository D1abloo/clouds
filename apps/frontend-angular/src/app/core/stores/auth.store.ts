import { Injectable, inject, computed } from '@angular/core'
import { AuthService } from '../services/auth.service'

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(AuthService)

  readonly user = computed(() => this.auth.user())

  logout = (): void => {
    this.auth.logout()
  }
}
