import type { SecuritySeverity } from './security.config'

const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

export interface SecurityKpi {
  label: string
  value: string | number
  icon: string
  tone: string
  hint?: string
  subtitle?: string
}

export interface FindingHistoryEntry {
  at: string
  action: string
  user: string
  note?: string
}

export interface SecurityRisk {
  id: string
  finding: string
  description: string
  resource: string
  resourceType: string
  provider: string
  region: string
  severity: SecuritySeverity
  status: string
  category: string
  riskType: string
  detectedAt: string
  recommendation: string
  impact: string
  remediationSteps: string[]
  evidence: string
  evidenceType: string
  cve?: string
  owner: string
  tags: string[]
  relatedResources: string[]
  history: FindingHistoryEntry[]
  remediable: boolean
  remediationAction?: string
}

export interface OpenPort {
  id: string
  host: string
  port: string
  service: string
  exposure: string
  protocol: string
  risk: SecuritySeverity
  provider: string
}

export interface ExposedService {
  id: string
  name: string
  endpoint: string
  auth: string
  exposure: string
  status: string
  provider: string
}

export interface FirewallRule {
  id: string
  name: string
  provider: string
  resource: string
  rules: number
  openPorts: number
  status: string
  egressRestricted: boolean
}

export interface SshKeyRecord {
  id: string
  name: string
  fingerprint: string
  host: string
  ageDays: number
  status: string
  lastUsed: string
  owner: string
}

export interface SecretExposure {
  id: string
  secret: string
  maskedValue: string
  location: string
  type: string
  severity: SecuritySeverity
  status: string
  detectedAt: string
  service: string
  origin: string
}

export interface SecurityRecommendation {
  id: string
  title: string
  impact: string
  effort: string
  status: string
  category: string
  description: string
}

const baseHistory = (mins: number): FindingHistoryEntry[] => [
  { at: ago(mins), action: 'Detectado', user: 'security-scanner', note: 'Hallazgo registrado por escaneo automático' },
  { at: ago(mins + 30), action: 'Clasificado', user: 'policy-engine', note: 'Severidad asignada según reglas de postura' },
]

export const defaultSecurityKpis = (): SecurityKpi[] => []

export const defaultSecurityRisks = (): SecurityRisk[] => []

export const defaultOpenPorts = (): OpenPort[] => []

export const defaultExposedServices = (): ExposedService[] => []

export const defaultFirewalls = (): FirewallRule[] => []

export const defaultSshKeys = (): SshKeyRecord[] => []

export const defaultSecretExposures = (): SecretExposure[] => []

export const defaultRecommendations = (): SecurityRecommendation[] => []

export const buildResourceInspect = (risk: SecurityRisk) => ({
  name: risk.resource,
  type: risk.resourceType,
  provider: risk.provider,
  region: risk.region,
  status: risk.status,
  owner: risk.owner,
  tags: risk.tags,
  relatedResources: risk.relatedResources,
  config: risk.evidence.split('\n').slice(0, 4).join('\n'),
  risks: [risk.finding],
})
