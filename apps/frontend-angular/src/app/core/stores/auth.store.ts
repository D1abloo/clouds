import { Injectable, inject, computed } from '@angular/core'
import { AuthService } from '../services/auth.service'
import { SidebarService, OrgInfo } from '../../layout/sidebar/sidebar.service'

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(AuthService)
  private readonly sidebar = inject(SidebarService)

  readonly user = computed(() => this.auth.user())
  readonly currentOrg = this.sidebar.currentOrg
  readonly availableOrgs = this.sidebar.availableOrgs

  setOrg = (org: OrgInfo): void => {
    this.sidebar.setOrg(org)
  }

  logout = (): void => {
    this.auth.logout()
  }
}
