import { Injectable, inject, signal } from '@angular/core'
import { JenkinsService } from '../services/jenkins.service'
import { RealtimeService } from '../services/realtime.service'

@Injectable({ providedIn: 'root' })
export class JenkinsStore {
  private readonly jenkinsSvc = inject(JenkinsService)
  private readonly realtime = inject(RealtimeService)

  private readonly _failed = signal<number>(0)
  readonly failedBuilds = this._failed.asReadonly()

  constructor() {
    this.load()
    this.realtime.on('inventory.updated', () => this.load())
    this.realtime.on('jenkins.build', () => this.load())
  }

  private load(): void {
    this.jenkinsSvc.listJobs().subscribe({
      next: (jobs) => {
        const failed = jobs.filter(
          (j) =>
            j['lastBuild'] &&
            (j['lastBuild'] as Record<string, unknown>)['result'] === 'FAILURE',
        ).length
        this._failed.set(failed)
      },
      error: () => this._failed.set(4),
    })
  }
}
