import type { CloudProvider } from '../core/models/api.models'
import type { TerraformRunItem, TerraformWorkspaceItem } from '../core/stores/terraform-run.store'
import type { TerraformLaunchRecord } from './terraform-folders'
export { TERRAFORM_FOLDERS } from './terraform-folders'

export interface TerraformPageSummary {
  workspaces: number
  runs: number
  plans: number
  applies: number
  errors: number
  lastSyncedAt: string
  items: Record<string, unknown>[]
}

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

/** PRO: solo datos devueltos por la API, sin relleno demo. */
export const TERRAFORM_DEMO_SUMMARY = emptyTerraformSummary()

export const defaultDemoWorkspaces = (): TerraformWorkspaceItem[] => []

export const defaultDemoLaunches = (): TerraformLaunchRecord[] => []

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

export const mergeTerraformSummaryPro = (raw: Record<string, unknown>): TerraformPageSummary => ({
  workspaces: Number(raw['workspaces'] ?? 0),
  runs: Number(raw['runs'] ?? 0),
  plans: Number(raw['plans'] ?? 0),
  applies: Number(raw['applies'] ?? 0),
  errors: Number(raw['errors'] ?? 0),
  lastSyncedAt: String(raw['lastSyncedAt'] ?? new Date().toISOString()),
  items: (raw['items'] as Record<string, unknown>[]) ?? [],
})

export const mergeTerraformSummary = mergeTerraformSummaryPro
