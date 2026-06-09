const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

export interface AuditActivityEntry {
  id: string
  action: string
  resource: string
  userId?: string
  ipAddress?: string
  createdAt: string
  category: string
  module: string
  status: string
  description: string
  userAgent?: string
  sessionId?: string
  correlationId?: string
  metadata?: Record<string, string>
  changes?: { field: string; before: string; after: string }[]
  environment?: string
  duration?: string
  requestMethod?: string
  outcome?: string
  riskLevel?: 'low' | 'medium' | 'high'
  tags?: string[]
  relatedEvents?: number
}

export interface SecurityEvent {
  id: string
  event: string
  source: string
  severity: string
  user: string
  ip: string
  at: string
  status: string
  description: string
  details: string
  correlationId: string
  affectedResources: string[]
  recommendation: string
}

export interface ComplianceTrailEntry {
  id: string
  action: string
  actor: string
  resource: string
  framework: string
  at: string
  outcome: string
  controlId: string
  description: string
  evidence: string
  notes: string
}

export interface AuditExport {
  id: string
  name: string
  format: string
  records: number
  status: string
  generatedAt: string
  requestedBy: string
  period: string
  filters: string
  sizeKb: number
  includes: string[]
}

export const defaultAuditActivities = (): AuditActivityEntry[] => []

export const defaultSecurityEvents = (): SecurityEvent[] => []

export const defaultComplianceTrail = (): ComplianceTrailEntry[] => []

export const defaultAuditExports = (): AuditExport[] => []
