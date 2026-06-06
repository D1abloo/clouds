import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import type {
  ApprovalActionType,
  ApprovalCloud,
  ApprovalEnvironment,
  ApprovalRisk,
  ApprovalSource,
  ApprovalStatus,
} from './approvals.demo'

export const APPROVAL_SOURCE_LABELS: Record<ApprovalSource, string> = {
  terraform: 'Terraform',
  'service-catalog': 'Catálogo de servicios',
  runbooks: 'Runbooks',
  jenkins: 'Jenkins',
  instances: 'Instancias',
}

export const APPROVAL_SOURCE_LOGO: Record<ApprovalSource, NavLogoKey> = {
  terraform: 'terraform',
  'service-catalog': 'aws',
  runbooks: 'prometheus',
  jenkins: 'jenkins',
  instances: 'aws',
}

export const APPROVAL_ACTION_LABELS: Record<ApprovalActionType, string> = {
  terraform_apply: 'Terraform apply',
  terraform_destroy: 'Terraform destroy',
  instance_stop: 'Detener instancia',
  instance_delete: 'Eliminar instancia',
  volume_delete: 'Eliminar volumen',
  template_launch: 'Lanzar plantilla',
  runbook_execute: 'Ejecutar runbook',
  secret_rotate: 'Rotar secreto',
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  delegated: 'Delegada',
}

export const APPROVAL_RISK_LABELS: Record<ApprovalRisk, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
}

export const APPROVAL_CLOUD_LABELS: Record<ApprovalCloud, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
}

export const APPROVAL_ENV_LABELS: Record<ApprovalEnvironment, string> = {
  production: 'Producción',
  staging: 'Staging',
  development: 'Desarrollo',
}

export const CLOUD_ACCENT: Record<ApprovalCloud, string> = {
  aws: '#ff9900',
  gcp: '#4285f4',
  azure: '#0078d4',
}

export const RISK_ACCENT: Record<ApprovalRisk, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#059669',
}
