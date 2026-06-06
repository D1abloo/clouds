import { Injectable, signal, computed } from '@angular/core'
import {
  defaultExposedServices,
  defaultFirewalls,
  defaultOpenPorts,
  defaultRecommendations,
  defaultSecretExposures,
  defaultSecurityKpis,
  defaultSecurityRisks,
  defaultSshKeys,
  type SecurityRisk,
} from './security-center.demo'

@Injectable({ providedIn: 'root' })
export class SecurityCenterService {
  readonly kpis = signal(defaultSecurityKpis())
  readonly risks = signal(defaultSecurityRisks())
  readonly ports = signal(defaultOpenPorts())
  readonly services = signal(defaultExposedServices())
  readonly firewalls = signal(defaultFirewalls())
  readonly sshKeys = signal(defaultSshKeys())
  readonly exposures = signal(defaultSecretExposures())
  readonly recommendations = signal(defaultRecommendations())
  readonly lastScanAt = signal<string | null>(null)
  readonly scanning = signal(false)

  readonly openPortCount = computed(() => this.ports().length)
  readonly exposedServiceCount = computed(() => this.services().length)
  readonly recommendationCount = computed(() =>
    this.recommendations().filter((r) => r.status === 'pending' || r.status === 'running').length,
  )

  updateRisk = (id: string, patch: Partial<SecurityRisk>): void => {
    this.risks.update((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  appendHistory = (id: string, action: string, user: string, note?: string): void => {
    this.risks.update((rows) =>
      rows.map((r) =>
        r.id === id
          ? {
              ...r,
              history: [
                { at: new Date().toISOString(), action, user, note },
                ...r.history,
              ],
            }
          : r,
      ),
    )
  }

  refreshKpis = (): void => {
    const risks = this.risks()
    const critical = risks.filter((r) => r.severity === 'critical' && r.status !== 'completed').length
    const score = Math.max(35, 100 - critical * 8 - risks.filter((r) => r.status === 'failed').length * 3)
    this.kpis.update((k) =>
      k.map((item) => {
        if (item.label === 'Puntuación de riesgo') {
          const tone = score >= 80 ? 'success' : score >= 60 ? 'warn' : 'critical'
          return { ...item, value: `${score}/100`, hint: score >= 80 ? 'Bueno' : score >= 60 ? 'Medio' : 'Crítico', tone }
        }
        if (item.label === 'Puertos abiertos') return { ...item, value: this.ports().length }
        if (item.label === 'Servicios expuestos') return { ...item, value: this.services().length }
        if (item.label === 'Recomendaciones') return { ...item, value: this.recommendationCount() }
        return item
      }),
    )
  }

  completeScan = (): void => {
    this.lastScanAt.set(new Date().toISOString())
    this.scanning.set(false)
    this.refreshKpis()
  }
}
