import { Injectable, signal } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  /** Monthly spend threshold (USD) — warn in launch review when exceeded */
  readonly monthlyCostThresholdUsd = signal(500)

  readonly ansibleConnected = signal(true)
}
