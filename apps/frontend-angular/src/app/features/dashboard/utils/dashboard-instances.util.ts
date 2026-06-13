import { DashboardInstanceRow } from '../dashboard.models'

const hiddenStatuses = new Set(['TERMINATED', 'DELETED', 'REMOVED'])

/** Instancias cloud y VPS en vivo: excluye demo en PRO, filas sin id y recursos eliminados. */
export const filterLiveCloudInstances = (
  rows: DashboardInstanceRow[] | undefined,
  proMode: boolean,
): DashboardInstanceRow[] =>
  (rows ?? []).filter((row) => {
    if (!row?.id) return false
    if (hiddenStatuses.has(String(row.status ?? '').toUpperCase())) return false
    if (proMode && row.isDemo) return false
    return true
  })
