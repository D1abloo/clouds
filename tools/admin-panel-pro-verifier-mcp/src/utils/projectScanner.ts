import fs from 'node:fs'
import path from 'node:path'

export type SidebarRouteItem = {
  section: string
  label: string
  route: string
  icon?: string
  logo?: string
}

export type ProjectScan = {
  root: string
  framework: string
  packageManager: string
  orm: string
  hasPrisma: boolean
  hasPlaywright: boolean
  envFiles: string[]
  testScripts: string[]
}

const read = (p: string): string => {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

export const getProjectRoot = (): string => {
  if (process.env.PROJECT_ROOT) return process.env.PROJECT_ROOT
  let dir = import.meta.dirname
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, 'apps/backend-api')) &&
      fs.existsSync(path.join(dir, 'apps/frontend-angular'))
    ) {
      return dir
    }
    dir = path.dirname(dir)
  }
  return path.resolve(import.meta.dirname, '../../../../..')
}

export const scanProjectStructure = (root = getProjectRoot()): ProjectScan => {
  const rootPkg = JSON.parse(read(path.join(root, 'package.json')) || '{}')
  const backendPkg = JSON.parse(read(path.join(root, 'apps/backend-api/package.json')) || '{}')
  const frontendPkg = JSON.parse(read(path.join(root, 'apps/frontend-angular/package.json')) || '{}')
  const envFiles = ['.env.example', '.env']
    .map((f) => path.join(root, f))
    .filter((p) => fs.existsSync(p))
    .map((p) => path.relative(root, p))

  const testScripts = [
    ...(rootPkg.scripts ? Object.keys(rootPkg.scripts) : []),
    ...(backendPkg.scripts ? Object.keys(backendPkg.scripts) : []),
    ...(frontendPkg.scripts ? Object.keys(frontendPkg.scripts) : []),
  ].filter((s) => /test|lint|typecheck|build|verify/i.test(s))

  return {
    root,
    framework: 'Angular 19 + NestJS monorepo',
    packageManager: fs.existsSync(path.join(root, 'pnpm-lock.yaml'))
      ? 'pnpm'
      : fs.existsSync(path.join(root, 'yarn.lock'))
        ? 'yarn'
        : 'npm',
    orm: fs.existsSync(path.join(root, 'apps/backend-api/prisma/schema.prisma')) ? 'Prisma' : 'unknown',
    hasPrisma: fs.existsSync(path.join(root, 'apps/backend-api/prisma/schema.prisma')),
    hasPlaywright: fs.existsSync(path.join(root, 'playwright.config.ts')) || fs.existsSync(path.join(root, 'e2e')),
    envFiles,
    testScripts: [...new Set(testScripts)],
  }
}

/** Parse SIDEBAR_MAIN_MODULES tabs + cloud branches from area-nav.config.ts */
export const extractSidebarRoutes = (root = getProjectRoot()): SidebarRouteItem[] => {
  const file = path.join(root, 'apps/frontend-angular/src/app/core/routing/area-nav.config.ts')
  const src = read(file)
  const items: SidebarRouteItem[] = []
  let currentSection = 'General'

  const sectionRe = /label:\s*'([^']+)'[\s\S]*?tabs:\s*\[/g
  const tabRe = /label:\s*'([^']+)',\s*route:\s*'([^']+)'/g

  const modules = src.split(/id:\s*'[\w-]+'/).slice(1)
  for (const block of modules) {
    const sectionMatch = block.match(/label:\s*'([^']+)'/)
    if (sectionMatch) currentSection = sectionMatch[1]

    let m: RegExpExecArray | null
    const tabSection = block.match(/tabs:\s*\[([\s\S]*?)\](?:,\s*branches|\s*,\s*match)/)
    if (tabSection) {
      const tabReLocal = /label:\s*'([^']+)',\s*route:\s*'([^']+)'/g
      while ((m = tabReLocal.exec(tabSection[1])) !== null) {
        items.push({ section: currentSection, label: m[1], route: m[2] })
      }
    }

    const branchSection = block.match(/branches:\s*CLOUD_SIDEBAR_BRANCHES/)
    if (branchSection) {
      for (const provider of ['aws', 'gcp', 'azure'] as const) {
        const base = `/cloud/${provider}`
        const labels: [string, string][] = [
          ['Resumen', `${base}/overview`],
          ['Cuentas', `${base}/accounts`],
          ['Instancias', `${base}/instances`],
          ['Red', `${base}/network`],
          ['Facturación', `${base}/billing`],
          ['Métricas', `${base}/metrics`],
        ]
        for (const [label, route] of labels) {
          items.push({ section: `${currentSection} › ${provider.toUpperCase()}`, label, route })
        }
      }
    }
  }

  // Fallback: regex whole file if parse yielded too few
  if (items.length < 20) {
    items.length = 0
    let section = 'Resumen'
    const lines = src.split('\n')
    for (const line of lines) {
      const sec = line.match(/^\s*label:\s*'(Resumen|Nubes|Infraestructura|Automatización|Repositorios|Observabilidad|Seguridad|Administración)'/)
      if (sec) section = sec[1]
      const tab = line.match(/label:\s*'([^']+)',\s*route:\s*'([^']+)'/)
      if (tab) items.push({ section, label: tab[1], route: tab[2] })
    }
  }

  return items
}

export const extractAngularRoutes = (root = getProjectRoot()): string[] => {
  const files = [
    'apps/frontend-angular/src/app/core/routing/navigation.routes.ts',
    'apps/frontend-angular/src/app/app.routes.ts',
  ]
  const routes = new Set<string>()
  for (const rel of files) {
    const src = read(path.join(root, rel))
    const re = /path:\s*'([^']+)'/g
    let m: RegExpExecArray | null
    while ((m = re.exec(src)) !== null) {
      if (!m[1].includes(':')) routes.add(`/${m[1]}`)
    }
  }
  return [...routes]
}

export const extractPrismaModels = (root = getProjectRoot()): string[] => {
  const schema = read(path.join(root, 'apps/backend-api/prisma/schema.prisma'))
  return [...schema.matchAll(/^model\s+(\w+)/gm)].map((m) => m[1])
}

export const extractBackendModules = (root = getProjectRoot()): string[] => {
  const modulesDir = path.join(root, 'apps/backend-api/src/modules')
  if (!fs.existsSync(modulesDir)) return []
  return fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}

export const listLogoAssets = (root = getProjectRoot()): string[] => {
  const dir = path.join(root, 'apps/frontend-angular/public/assets/logos')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
}

export const fileExists = (root: string, rel: string): boolean =>
  fs.existsSync(path.join(root, rel))

export const scanPageForMockSignals = (componentPath: string): string[] => {
  const src = read(componentPath)
  const issues: string[] = []
  if (/\bTODO\b|\bFIXME\b|coming soon|lorem ipsum/i.test(src)) issues.push('TODO/placeholder text')
  if (/lorem ipsum/i.test(src)) issues.push('lorem ipsum')
  if (!/PageHeaderComponent|page-header|app-page-header/.test(src) && !/selector:/.test(src)) {
    /* ok for small components */
  }
  if (/Sign In|Sign in|Loading\.\.\.|Click here|Dashboard\b/.test(src)) issues.push('English UI copy detected')
  return issues
}

export const resolveComponentForRoute = (route: string, root = getProjectRoot()): string | null => {
  const navFile = read(path.join(root, 'apps/frontend-angular/src/app/core/routing/navigation.routes.ts'))
  const segment = route.replace(/^\//, '').split('/')[0]
  const re = new RegExp(`path:\\s*'${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^']*'[\\s\\S]*?import\\('([^']+)'\\)`)
  const m = navFile.match(re)
  if (!m) return null
  const importPath = m[1].replace(/\.\.\//g, '')
  const candidates = [
    path.join(root, 'apps/frontend-angular/src/app', importPath + '.ts'),
    path.join(root, 'apps/frontend-angular/src/app', importPath.replace(/\.component$/, '') + '.component.ts'),
  ]
  return candidates.find((p) => fs.existsSync(p)) ?? null
}

export const REQUIRED_SCHEMA_ALIASES: Record<string, string[]> = {
  users: ['User'],
  roles: ['Role'],
  permissions: ['Permission'],
  role_permissions: ['RolePermission'],
  sessions: ['UserSession', 'SshSession'],
  oauth_accounts: ['OAuthAccount', 'GithubAccount'],
  cloud_accounts: ['CloudAccount'],
  cloud_credentials: ['CloudCredential'],
  resources: ['KubernetesResource', 'Instance'],
  instances: ['Instance'],
  servers: ['VpsServer', 'JenkinsServer'],
  containers: ['DockerContainer'],
  kubernetes_clusters: ['KubernetesCluster'],
  networks: ['CloudRegion'],
  storage_volumes: ['StorageVolume'],
  backups: ['Backup'],
  deployments: ['GithubDeployment'],
  automation_jobs: ['JenkinsJob', 'JenkinsBuild'],
  runbooks: ['Runbook'],
  schedules: ['Schedule'],
  approvals: ['Approval'],
  repositories: ['GithubRepository'],
  webhooks: ['GithubWebhook'],
  branches: ['GithubBranch'],
  commits: ['GithubCommit'],
  pull_requests: ['GithubPullRequest'],
  metrics: ['MetricSample'],
  logs: ['TerraformRunLog', 'CommandExecution'],
  billing_accounts: ['BillingAccount'],
  invoices: ['BillingRecord'],
  cost_optimization_recommendations: ['CostOptimizationRecommendation'],
  alerts: ['Alert', 'AlertRule'],
  incidents: ['Alert'],
  notifications: ['Notification'],
  reports: ['Report'],
  change_management: ['ChangeRequest'],
  secrets: ['Secret'],
  compliance_policies: ['CompliancePolicy'],
  audit_logs: ['AuditLog'],
  api_tokens: ['ApiToken'],
  settings: ['IntegrationConfig', 'Setting'],
  assistant_threads: ['AssistantThread'],
  assistant_messages: ['AssistantMessage'],
}

export const REQUIRED_API_MODULES = [
  'aws', 'gcp', 'azure', 'instances', 'vps', 'docker', 'kubernetes', 'network', 'storage', 'backups',
  'capacity', 'jenkins', 'terraform', 'deployments', 'sessions', 'history', 'runbooks', 'scheduler',
  'service-catalog', 'approvals', 'github', 'gitlab', 'webhooks', 'branches', 'commits', 'pull-requests',
  'metrics', 'logs', 'billing', 'cost-optimizer', 'alerts', 'incidents', 'notifications', 'reports',
  'change-management', 'security', 'secrets', 'compliance', 'access-control', 'audit', 'users', 'roles',
  'api-tokens', 'settings', 'demo', 'integrations', 'command-center',
] as const

export const mapApiModuleCoverage = (backendModules: string[]): Record<string, boolean> => {
  const map: Record<string, string[]> = {
    aws: ['cloud-accounts', 'instances'],
    gcp: ['cloud-accounts', 'instances'],
    azure: ['cloud-accounts', 'instances'],
    instances: ['instances'],
    vps: ['vps'],
    docker: ['docker'],
    kubernetes: ['kubernetes'],
    network: ['inventory', 'cloud-accounts'],
    storage: ['inventory'],
    backups: ['inventory'],
    capacity: ['inventory'],
    jenkins: ['jenkins'],
    terraform: ['terraform'],
    deployments: ['github', 'jenkins'],
    sessions: ['ssh'],
    history: ['ssh', 'audit'],
    runbooks: ['command-center'],
    scheduler: ['command-center'],
    'service-catalog': ['inventory'],
    approvals: ['command-center'],
    github: ['github'],
    gitlab: ['github'],
    webhooks: ['github', 'integrations'],
    branches: ['github'],
    commits: ['github'],
    'pull-requests': ['github'],
    metrics: ['metrics'],
    logs: ['metrics', 'audit'],
    billing: ['billing'],
    'cost-optimizer': ['billing'],
    alerts: ['alerts'],
    incidents: ['alerts'],
    notifications: ['notifications'],
    reports: ['metrics', 'audit'],
    'change-management': ['command-center'],
    security: ['audit'],
    secrets: ['integrations'],
    compliance: ['audit'],
    'access-control': ['roles', 'permissions', 'users'],
    audit: ['audit'],
    users: ['users'],
    roles: ['roles'],
    'api-tokens': ['users'],
    settings: ['integrations'],
    demo: ['demo'],
    integrations: ['integrations'],
    'command-center': ['command-center'],
  }
  const out: Record<string, boolean> = {}
  for (const key of REQUIRED_API_MODULES) {
    const mods = map[key]
    out[key] = mods ? mods.every((m) => backendModules.includes(m)) : backendModules.some((m) => m.includes(key.replace(/-/g, '')))
  }
  return out
}
