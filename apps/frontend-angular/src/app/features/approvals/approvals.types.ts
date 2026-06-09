import type { ServiceCatalogCategory } from '../service-catalog/service-catalog.types'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'delegated'
export type ApprovalRisk = 'critical' | 'high' | 'medium' | 'low'
export type ApprovalSource = 'terraform' | 'service-catalog' | 'runbooks' | 'jenkins' | 'instances'
export type ApprovalCloud = 'aws' | 'gcp' | 'azure'
export type ApprovalEnvironment = 'production' | 'staging' | 'development'

export type ApprovalActionType =
  | 'terraform_apply'
  | 'terraform_destroy'
  | 'instance_stop'
  | 'instance_delete'
  | 'volume_delete'
  | 'template_launch'
  | 'runbook_execute'
  | 'secret_rotate'

export interface ApprovalComment {
  author: string
  at: string
  text: string
}

export interface ApprovalStep {
  role: string
  user: string
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  at?: string
}

export interface ApprovalImpact {
  costDelta?: string
  downtime?: string
  affectedServices: string[]
  blastRadius: string
}

export type ApprovalPendingExecution =
  | {
      kind: 'service-catalog-launch'
      templateId: string
      templateName: string
      templateVersion: string
      cloud: ApprovalCloud
      category: ServiceCatalogCategory
      options: {
        environment: ApprovalEnvironment
        parameters: string
        note: string
        dryRun: boolean
        notifyOnComplete: boolean
      }
      requester: string
    }
