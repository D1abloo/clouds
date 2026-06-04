import type { GithubRepo } from '../../../core/services/github.service'

/** Resumen inventario GitHub cuando el API no responde */
export const buildGithubInventoryFallback = (): Record<string, unknown> => ({
  connected: true,
  username: 'cloudops-demo',
  demoMode: true,
  repoCount: 8,
  branchCount: 32,
  commitCount: 32,
  openPullRequests: 16,
  webhookCount: 4,
  deploymentCount: 4,
  repoItems: [] as GithubRepo[],
  lastSyncAt: new Date().toISOString(),
})
