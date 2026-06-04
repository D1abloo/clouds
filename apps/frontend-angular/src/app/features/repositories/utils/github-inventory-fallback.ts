import { CLIENT_DEMO_GITHUB_REPOS } from './github-demo-catalog'

/** Resumen inventario GitHub cuando el API no responde */
export const buildGithubInventoryFallback = (): Record<string, unknown> => {
  const n = CLIENT_DEMO_GITHUB_REPOS.length
  return {
    connected: true,
    username: 'cloudops-demo',
    demoMode: true,
    repoCount: n,
    branchCount: n * 4,
    commitCount: n * 4,
    openPullRequests: n * 2,
    webhookCount: 4,
    deploymentCount: 6,
    repoItems: CLIENT_DEMO_GITHUB_REPOS,
    lastSyncAt: new Date().toISOString(),
  }
}
