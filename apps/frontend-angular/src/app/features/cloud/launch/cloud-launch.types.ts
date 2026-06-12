import type { CloudProvider } from '../../../core/models/api.models'
import type { CloudSlug } from '../cloud-provider.data'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

export type CloudLaunchStepId =
  | 'provider'
  | 'account'
  | 'region'
  | 'network'
  | 'compute'
  | 'image'
  | 'review'
  | 'launch'
  | 'test'
  | 'delete'

export type CloudLaunchWizardData = {
  accountId: string
  accountName: string
  provider: CloudProvider
  slug: CloudSlug
  defaultRegion?: string
  preselectedImageId?: string
}

export type ProviderCard = {
  slug: CloudSlug | 'ionos'
  provider: CloudProvider | 'IONOS_VPS'
  label: string
  tagline: string
  logo: NavLogoKey
  description?: string
  connectionState?: string
  initialCost?: string
}

export type LaunchPreflightUiCheck = {
  id: string
  level: 'error' | 'warning' | 'ok'
  message: string
  suggestion?: string
}

export type LaunchedResource = {
  id: string
  name: string
  provider: string
  region?: string
  status?: string
  publicIp?: string
}
