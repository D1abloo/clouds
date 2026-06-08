import { Injectable, inject } from '@angular/core'
import { AlertsStore } from '../stores/alerts.store'
import { JenkinsStore } from '../stores/jenkins.store'
import { VpsStore } from '../stores/vps.store'
import { NotificationsStore } from '../stores/notifications.store'
import { ProModeService } from '../services/pro-mode.service'

@Injectable({ providedIn: 'root' })
export class NavBadgeService {
  private readonly alertsStore = inject(AlertsStore)
  private readonly jenkinsStore = inject(JenkinsStore)
  private readonly vpsStore = inject(VpsStore)
  private readonly notificationsStore = inject(NotificationsStore)
  private readonly pro = inject(ProModeService)

  resolve = (key?: string): number | null => {
    if (!key) return null

    if (key === 'alerts') {
      const n = this.alertsStore.activeAlerts()
      return n > 0 ? n : null
    }

    if (key === 'jenkins') {
      const n = this.jenkinsStore.failedBuilds()
      return n > 0 ? n : null
    }

    if (key === 'vps') {
      const n = this.vpsStore.totalHosts()
      return n > 0 ? n : null
    }

    const fromNotifications = this.notificationsStore.unreadForSection(key)
    if (fromNotifications > 0) return fromNotifications

    if (key === 'notifications') {
      const total = this.notificationsStore.unreadTotal()
      return total > 0 ? total : null
    }

    if (this.pro.demoMode()) return null
    return null
  }
}
