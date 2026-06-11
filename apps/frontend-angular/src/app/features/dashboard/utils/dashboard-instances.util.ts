import { DashboardInstanceRow } from '../dashboard.models'

/** Instancias cloud en vivo: excluye VPS, demo en PRO y filas sin id. */
export const filterLiveCloudInstances = (
  rows: DashboardInstanceRow[] | undefined,
  proMode: boolean,
): DashboardInstanceRow[] =>
  (rows ?? []).filter((row) => {
    if (!row?.id) return false
    if (row.isVps) return false
    if (proMode && row.isDemo) return false
    return true
  })
