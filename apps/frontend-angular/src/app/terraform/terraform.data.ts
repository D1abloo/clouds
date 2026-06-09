import type { CloudProvider } from '../core/models/api.models'
import type { TerraformRunItem, TerraformWorkspaceItem } from '../core/stores/terraform-run.store'
export { defaultDemoLaunches, TERRAFORM_FOLDERS } from './terraform-folders'
import { HCL_TEMPLATE_AWS, HCL_TEMPLATE_AZURE, HCL_TEMPLATE_GCP } from './terraform-hcl-templates'

export interface TerraformPageSummary {
  workspaces: number
  runs: number
  plans: number
  applies: number
  errors: number
  lastSyncedAt: string
  items: Record<string, unknown>[]
}

export const TERRAFORM_DEMO_SUMMARY: TerraformPageSummary = {
  workspaces: 6,
  runs: 24,
  plans: 3,
  applies: 18,
  errors: 1,
  lastSyncedAt: new Date().toISOString(),
  items: [
    { id: 'ws-aws-prod', name: 'aws-production', workspaceName: 'aws-production', provider: 'AWS', status: 'APPLIED' },
    { id: 'ws-aws-stg', name: 'aws-staging', workspaceName: 'aws-staging', provider: 'AWS', status: 'PLANNED' },
    { id: 'ws-gcp', name: 'gcp-analytics', workspaceName: 'gcp-analytics', provider: 'GCP', status: 'APPLIED' },
    { id: 'ws-azure', name: 'azure-core', workspaceName: 'azure-core', provider: 'AZURE', status: 'FAILED' },
    { id: 'run-1', workspaceName: 'aws-production', provider: 'AWS', status: 'APPLIED', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'run-2', workspaceName: 'aws-staging', provider: 'AWS', status: 'PLANNED', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'run-3', workspaceName: 'gcp-analytics', provider: 'GCP', status: 'APPLIED', createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
}

export const defaultDemoWorkspaces = (): TerraformWorkspaceItem[] => []

export const demoRunsFromSummary = (items: Record<string, unknown>[]): TerraformRunItem[] =>
  items
    .filter((r) => r['workspaceName'] && r['createdAt'])
    .map((r, i) => ({
      id: String(r['id'] ?? `run-${i}`),
      workspaceName: String(r['workspaceName'] ?? r['name'] ?? 'workspace'),
      provider: (r['provider'] as CloudProvider) ?? 'AWS',
      status: String(r['status'] ?? 'PLANNED'),
      createdAt: String(r['createdAt'] ?? new Date().toISOString()),
    }))

export const emptyTerraformSummary = (): TerraformPageSummary => ({
  workspaces: 0,
  runs: 0,
  plans: 0,
  applies: 0,
  errors: 0,
  lastSyncedAt: new Date().toISOString(),
  items: [],
})

export const hasTerraformLiveData = (summary: TerraformPageSummary): boolean =>
  summary.workspaces > 0 || summary.items.length > 0

export const mergeTerraformSummary = (raw: Record<string, unknown>): TerraformPageSummary => ({
  workspaces: Number(raw['workspaces'] ?? TERRAFORM_DEMO_SUMMARY.workspaces),
  runs: Number(raw['runs'] ?? TERRAFORM_DEMO_SUMMARY.runs),
  plans: Number(raw['plans'] ?? TERRAFORM_DEMO_SUMMARY.plans),
  applies: Number(raw['applies'] ?? TERRAFORM_DEMO_SUMMARY.applies),
  errors: Number(raw['errors'] ?? TERRAFORM_DEMO_SUMMARY.errors),
  lastSyncedAt: String(raw['lastSyncedAt'] ?? TERRAFORM_DEMO_SUMMARY.lastSyncedAt),
  items: (raw['items'] as Record<string, unknown>[])?.length
    ? (raw['items'] as Record<string, unknown>[])
    : TERRAFORM_DEMO_SUMMARY.items,
})

/** PRO: solo datos devueltos por la API, sin relleno demo. */
export const mergeTerraformSummaryPro = (raw: Record<string, unknown>): TerraformPageSummary => ({
  workspaces: Number(raw['workspaces'] ?? 0),
  runs: Number(raw['runs'] ?? 0),
  plans: Number(raw['plans'] ?? 0),
  applies: Number(raw['applies'] ?? 0),
  errors: Number(raw['errors'] ?? 0),
  lastSyncedAt: String(raw['lastSyncedAt'] ?? new Date().toISOString()),
  items: (raw['items'] as Record<string, unknown>[]) ?? [],
})
