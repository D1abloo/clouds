import { ConfigService } from '@nestjs/config'
import { ForbiddenException } from '@nestjs/common'

export const isDemoModeEnabled = (config: ConfigService): boolean =>
  config.get<string>('DEMO_MODE', 'false') === 'true'

export const assertDemoModeEnabled = (config: ConfigService): void => {
  if (!isDemoModeEnabled(config)) {
    throw new ForbiddenException(
      'Modo demo deshabilitado en producción. Configure DEMO_MODE=true solo en entornos locales.',
    )
  }
}

export const emptyGithubInventorySummary = () => ({
  connected: false,
  username: null as string | null,
  demoMode: false,
  repoCount: 0,
  branchCount: 0,
  commitCount: 0,
  openPullRequests: 0,
  webhookCount: 0,
  deploymentCount: 0,
  repoItems: [] as unknown[],
  lastSyncAt: null as string | null,
  message: 'Sin cuentas conectadas. Añade una cuenta para comenzar.',
})
