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
} from './security-center.data'
import type { SecurityScanReport } from './security-scan-report.util'

const SCAN_REPORTS_STORAGE_KEY = 'cloudops-security-scan-reports'

const loadScanReportsFromStorage = (): SecurityScanReport[] => {
  try {
    const raw = localStorage.getItem(SCAN_REPORTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SecurityScanReport[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export interface ScanCompletionResult {
  previousScore: number
  newScore: number
  scoreDelta: number
  resourcesScanned: number
  totalFindings: number
  newFindings: SecurityRisk[]
  report?: SecurityScanReport
}

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
  readonly scanReports = signal<SecurityScanReport[]>(loadScanReportsFromStorage())

  readonly latestScanReport = computed(() => this.scanReports()[0] ?? null)

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

  completeScan = (result?: Pick<ScanCompletionResult, 'newFindings'>): void => {
    this.lastScanAt.set(new Date().toISOString())
    this.scanning.set(false)

    if (result?.newFindings.length) {
      this.risks.update((rows) => [...result.newFindings, ...rows])
    }

    this.refreshKpis()
  }

  saveScanReport = (report: SecurityScanReport): void => {
    this.scanReports.update((rows) => {
      const next = [report, ...rows.filter((r) => r.id !== report.id)].slice(0, 25)
      localStorage.setItem(SCAN_REPORTS_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  getScanReport = (id: string): SecurityScanReport | undefined =>
    this.scanReports().find((r) => r.id === id)
}
