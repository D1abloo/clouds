export type { NavIconTone } from './sidebar-nav.config'
export {
  SIDEBAR_MAIN_MODULES,
  resolveAreaFromPath,
  resolveCloudProviderFromPath,
  resolveVpsProviderFromPath,
  cloudSectionTabs,
  vpsSectionTabs,
  CLOUD_SIDEBAR_BRANCHES,
  VPS_SIDEBAR_BRANCHES,
  flattenAreaNavForSearch,
  type SidebarMainModule,
  type SidebarNavBranch,
  type AreaNavTab,
} from '../../core/routing/area-nav.config'

export const DEFAULT_FAVORITES = [
  '/dashboard',
  '/resource-explorer',
  '/health-center',
  '/command-center',
  '/ai-assistant',
  '/alerts/active',
]

export { flattenAreaNavForSearch as flattenSidebarNav } from '../../core/routing/area-nav.config'
