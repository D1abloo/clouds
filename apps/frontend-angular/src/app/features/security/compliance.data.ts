import type { SecuritySeverity } from './security.config'

const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

export interface ComplianceViolation {
  id: string
  rule: string
  resource: string
  severity: SecuritySeverity
  recommendation: string
  status: string
  framework: string
  detectedAt: string
  description: string
  impact: string
  controlId: string
  owner: string
  evidence: string
  remediationSteps: string[]
  affectedResources: string[]
}

export interface ComplianceRule {
  id: string
  name: string
  scope: string
  violations: number
  status: string
  description: string
}

export interface ComplianceFramework {
  id: string
  name: string
  score: number
  controls: number
  passed: number
  failed: number
  lastAudit: string
}

export interface ComplianceReportSection {
  title: string
  paragraphs: string[]
}

export interface ComplianceReport {
  id: string
  name: string
  framework: string
  period: string
  status: string
  generatedAt: string
  score: number
  violationsCount: number
  passedControls: number
  failedControls: number
  executiveSummary: string
  sections: ComplianceReportSection[]
  recommendations: string[]
  appendix?: string[]
}

export const defaultViolations = (): ComplianceViolation[] => []

export const defaultRules = (): ComplianceRule[] => []

export const defaultFrameworks = (): ComplianceFramework[] => []

export const defaultComplianceReports = (): ComplianceReport[] => []
