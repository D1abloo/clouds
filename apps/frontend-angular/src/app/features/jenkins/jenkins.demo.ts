import { isProdReadinessComplete, prodReadinessFromCreateForm } from './jenkins-prod-readiness'
import type {
  CreateJenkinsJobForm,
  JenkinsAgent,
  JenkinsBuild,
  JenkinsInventory,
  JenkinsJob,
  JenkinsQueueItem,
  JenkinsServer,
  JenkinsStage,
} from './jenkins.models'

const logSnippet = (job: string, status: string): string =>
  `[Pipeline] Start — ${job}\n` +
  `[Pipeline] node (docker-agent)\n` +
  `[Pipeline] stage ('Checkout')\n` +
  `Checking out Revision abc${job.length}f9 (${job})\n` +
  `[Pipeline] stage ('Build')\n` +
  `[Pipeline] sh\n` +
  `+ npm ci\n` +
  `[Pipeline] sh\n` +
  `+ npm test\n` +
  `Tests: 142 total, 140 passed, 2 failed, 0 skipped\n` +
  `[Pipeline] stage ('Deploy')\n` +
  `Deploying to target environment…\n` +
  `Finished: ${status}\n`

const defaultStages = (status: string): JenkinsStage[] => [
  { name: 'Checkout SCM', status: 'SUCCESS', duration: '18s' },
  { name: 'Prepare', status: status === 'RUNNING' ? 'RUNNING' : 'SUCCESS', duration: '42s' },
  { name: 'Build & Test', status: status === 'FAILURE' ? 'FAILURE' : status === 'RUNNING' ? 'RUNNING' : 'SUCCESS', duration: '3m 12s' },
  { name: 'Docker image', status: status === 'RUNNING' ? 'PENDING' : 'SUCCESS', duration: '2m 05s' },
  { name: 'Deploy', status: status === 'FAILURE' ? 'FAILURE' : status === 'RUNNING' ? 'PENDING' : 'SUCCESS', duration: '1m 10s' },
]

const ago = (mins: number): string => {
  if (mins < 60) return `Hace ${mins} min`
  return `Hace ${Math.floor(mins / 60)} h`
}

const WEEK_BUILD_COUNTS = [
  { daysAgo: 6, success: 18, failed: 1 },
  { daysAgo: 5, success: 22, failed: 0 },
  { daysAgo: 4, success: 24, failed: 2 },
  { daysAgo: 3, success: 21, failed: 1 },
  { daysAgo: 2, success: 19, failed: 0 },
  { daysAgo: 1, success: 11, failed: 1 },
  { daysAgo: 0, success: 7, failed: 0 },
]

const JOB_NAMES_FOR_BUILDS = [
  'deploy-api-staging',
  'deploy-api-production',
  'terraform-plan-aws',
  'terraform-apply-aws',
  'docker-build-frontend',
  'k8s-rollout-staging',
  'security-scan-nightly',
  'backup-verify-vps',
]

const synthesizeWeeklyBuilds = (jobs: JenkinsJob[]): JenkinsBuild[] => {
  const builds: JenkinsBuild[] = []
  const triggers = ['admin@cloudops.local', 'webhook', 'github-push', 'timer', 'upstream']
  let buildCounter = 900

  for (const day of WEEK_BUILD_COUNTS) {
    const base = new Date()
    base.setHours(8, 0, 0, 0)
    base.setDate(base.getDate() - day.daysAgo)
    let slot = 0

    const add = (status: 'SUCCESS' | 'FAILURE' | 'UNSTABLE' | 'RUNNING') => {
      const jobName = JOB_NAMES_FOR_BUILDS[slot % JOB_NAMES_FOR_BUILDS.length]
      const job = jobs.find((j) => j.name === jobName) ?? jobs[0]
      const at = new Date(base)
      at.setHours(8 + (slot % 10), (slot * 7) % 60, 0, 0)
      slot++
      buildCounter++
      builds.push({
        jobName,
        buildNum: buildCounter,
        status,
        createdAt: at.toISOString(),
        duration: status === 'RUNNING' ? '—' : `${2 + (slot % 8)}m ${10 + (slot % 50)}s`,
        branch: job?.branch ?? 'main',
        triggeredBy: triggers[slot % triggers.length],
        commit: `${(100000 + buildCounter).toString(16)}`,
      })
    }

    for (let i = 0; i < day.success; i++) {
      const running = day.daysAgo === 0 && i === 0
      add(running ? 'RUNNING' : 'SUCCESS')
    }
    for (let i = 0; i < day.failed; i++) add('FAILURE')
  }

  builds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return builds
}

export const createJobFromForm = (
  form: CreateJenkinsJobForm,
  servers: JenkinsServer[],
  scmValidated = false,
): JenkinsJob => {
  const server = servers.find((s) => s.id === form.serverId) ?? servers[0]
  const health: JenkinsJob['health'] = 'sunny'
  const prodChecks = prodReadinessFromCreateForm(form, scmValidated)
  const prodLaunchReady =
    form.defaultEnvironment !== 'production' || isProdReadinessComplete(prodChecks)
  return {
    name: form.name,
    folder: form.folder,
    server: server.name,
    serverId: server.id,
    type: form.type,
    status: 'SUCCESS',
    health,
    lastRun: 'Aún no ejecutado',
    duration: '—',
    branch: form.branch,
    buildNum: 0,
    description: form.description,
    scm: {
      type: 'Git',
      url: form.scmUrl,
      branch: form.branch,
      commit: '—',
      author: 'admin@cloudops.local',
    },
    upstream: [],
    downstream: [],
    parameters: [
      { key: 'BRANCH', default: form.branch, description: 'Rama por defecto' },
      { key: 'ENVIRONMENT', default: form.defaultEnvironment, description: 'Entorno destino' },
      { key: 'AGENT_LABEL', default: form.agentLabel, description: 'Etiqueta del agente' },
      { key: 'JENKINSFILE', default: form.jenkinsfilePath, description: 'Ruta del pipeline' },
      ...(form.enableBuildParameters
        ? [
            { key: 'SKIP_TESTS', default: String(form.skipTestsDefault), description: 'Omitir tests' },
            { key: 'RUN_SONAR', default: String(form.runSonarDefault), description: 'Análisis Sonar' },
            {
              key: 'REQUIRE_APPROVAL',
              default: String(form.requireApprovalProd),
              description: 'Aprobación manual en prod',
            },
          ]
        : []),
    ],
    stages: defaultStages('SUCCESS'),
    artifacts: [],
    tests: { total: 0, passed: 0, failed: 0, skipped: 0, duration: '—' },
    triggers: [
      'Manual',
      ...(form.enableWebhook ? [`Webhook ${form.scmType}`] : []),
      ...(form.pollScmMinutes > 0 ? [`SCM poll (${form.pollScmMinutes} min)`] : []),
      ...(form.cronTrigger ? [`Cron ${form.cronTrigger}`] : []),
      ...(form.concurrentBuilds ? ['Throttle concurrent builds'] : []),
    ],
    prodLaunchReady,
  }
}

const buildJobs = (): JenkinsJob[] => [
  {
    name: 'deploy-api-staging',
    folder: '/cloudops/apps',
    server: 'jenkins-01.cloudops.local',
    serverId: 'jenkins-01',
    type: 'pipeline',
    status: 'SUCCESS',
    health: 'sunny',
    lastRun: ago(12),
    duration: '4m 32s',
    branch: 'main',
    buildNum: 847,
    description: 'Pipeline declarativo: build, test y deploy a staging.',
    scm: { type: 'Git', url: 'github.com/cloudops/api-gateway', branch: 'main', commit: 'a3f91c2', author: 'isaac@cloudops.local' },
    upstream: ['docker-build-frontend'],
    downstream: ['k8s-rollout-staging'],
    parameters: [
      { key: 'BRANCH', default: 'main', description: 'Rama a desplegar' },
      { key: 'ENVIRONMENT', default: 'staging', description: 'Entorno destino' },
      { key: 'SKIP_TESTS', default: 'false', description: 'Omitir suite de tests' },
    ],
    stages: defaultStages('SUCCESS'),
    artifacts: [
      { name: 'api-gateway.war', size: '48 MB', path: 'target/api-gateway.war' },
      { name: 'coverage-report.zip', size: '2.1 MB', path: 'reports/coverage.zip' },
    ],
    tests: { total: 142, passed: 142, failed: 0, skipped: 0, duration: '1m 48s' },
    triggers: ['SCM poll (5 min)', 'Webhook GitHub', 'Manual'],
  },
  {
    name: 'deploy-api-production',
    folder: '/cloudops/apps',
    server: 'jenkins-01.cloudops.local',
    serverId: 'jenkins-01',
    type: 'pipeline',
    status: 'RUNNING',
    health: 'cloudy',
    lastRun: ago(2),
    duration: '—',
    branch: 'release/2.4',
    buildNum: 848,
    description: 'Promoción controlada a producción con aprobación manual.',
    scm: { type: 'Git', url: 'github.com/cloudops/api-gateway', branch: 'release/2.4', commit: 'b812e0a', author: 'deploy-bot' },
    upstream: ['deploy-api-staging'],
    downstream: [],
    parameters: [
      { key: 'BRANCH', default: 'release/2.4', description: 'Rama release' },
      { key: 'ENVIRONMENT', default: 'production', description: 'Producción' },
      { key: 'JENKINSFILE', default: 'Jenkinsfile', description: 'Ruta del pipeline' },
      { key: 'SKIP_TESTS', default: 'false', description: 'Omitir tests' },
      { key: 'RUN_SONAR', default: 'true', description: 'Análisis Sonar' },
      { key: 'REQUIRE_APPROVAL', default: 'true', description: 'Aprobación manual en prod' },
      { key: 'CHANGE_TICKET', default: 'CHG-2041', description: 'Ticket de cambio' },
    ],
    stages: defaultStages('RUNNING'),
    artifacts: [],
    tests: { total: 142, passed: 138, failed: 0, skipped: 4, duration: '—' },
    triggers: ['Manual', 'Upstream deploy-api-staging'],
    prodLaunchReady: true,
  },
  {
    name: 'terraform-plan-aws',
    folder: '/cloudops/infra',
    server: 'jenkins-02.cloudops.local',
    serverId: 'jenkins-02',
    type: 'pipeline',
    status: 'SUCCESS',
    health: 'sunny',
    lastRun: ago(45),
    duration: '2m 18s',
    branch: 'infra/main',
    buildNum: 412,
    description: 'Terraform plan sobre workspaces AWS.',
    scm: { type: 'Git', url: 'github.com/cloudops/terraform-aws', branch: 'infra/main', commit: 'c4410de', author: 'infra@cloudops.local' },
    upstream: [],
    downstream: ['terraform-apply-aws'],
    parameters: [
      { key: 'WORKSPACE', default: 'aws-production', description: 'Workspace TF' },
      { key: 'VAR_FILE', default: 'prod.tfvars', description: 'Variables' },
    ],
    stages: [
      { name: 'Init', status: 'SUCCESS', duration: '22s' },
      { name: 'Validate', status: 'SUCCESS', duration: '15s' },
      { name: 'Plan', status: 'SUCCESS', duration: '1m 41s' },
    ],
    artifacts: [{ name: 'plan.out', size: '156 KB', path: 'artifacts/plan.out' }],
    tests: { total: 0, passed: 0, failed: 0, skipped: 0, duration: '—' },
    triggers: ['SCM poll (15 min)', 'Manual'],
  },
  {
    name: 'terraform-apply-aws',
    folder: '/cloudops/infra',
    server: 'jenkins-02.cloudops.local',
    serverId: 'jenkins-02',
    type: 'pipeline',
    status: 'FAILURE',
    health: 'stormy',
    lastRun: ago(90),
    duration: '6m 05s',
    branch: 'infra/main',
    buildNum: 411,
    description: 'Apply Terraform tras plan aprobado.',
    scm: { type: 'Git', url: 'github.com/cloudops/terraform-aws', branch: 'infra/main', commit: 'c4410de', author: 'infra@cloudops.local' },
    upstream: ['terraform-plan-aws'],
    downstream: [],
    parameters: [
      { key: 'WORKSPACE', default: 'aws-production', description: 'Workspace TF' },
      { key: 'AUTO_APPROVE', default: 'false', description: 'Aprobar apply automático' },
    ],
    stages: [
      { name: 'Init', status: 'SUCCESS', duration: '20s' },
      { name: 'Apply', status: 'FAILURE', duration: '5m 12s' },
    ],
    artifacts: [{ name: 'apply.log', size: '89 KB', path: 'logs/apply.log' }],
    tests: { total: 0, passed: 0, failed: 0, skipped: 0, duration: '—' },
    triggers: ['Upstream terraform-plan-aws'],
  },
  {
    name: 'docker-build-frontend',
    folder: '/cloudops/apps',
    server: 'jenkins-01.cloudops.local',
    serverId: 'jenkins-01',
    type: 'multibranch',
    status: 'SUCCESS',
    health: 'sunny',
    lastRun: ago(28),
    duration: '8m 11s',
    branch: 'develop',
    buildNum: 1203,
    description: 'Multibranch: build imagen Docker del frontend.',
    scm: { type: 'Git', url: 'github.com/cloudops/web-ui', branch: 'develop', commit: '9e2ab01', author: 'frontend@cloudops.local' },
    upstream: [],
    downstream: ['deploy-api-staging'],
    parameters: [{ key: 'DOCKER_TAG', default: 'latest', description: 'Tag de imagen' }],
    stages: defaultStages('SUCCESS'),
    artifacts: [{ name: 'web-ui-latest.tar', size: '312 MB', path: 'images/web-ui.tar' }],
    tests: { total: 89, passed: 89, failed: 0, skipped: 0, duration: '2m 10s' },
    triggers: ['Webhook GitHub', 'Multibranch scan'],
  },
  {
    name: 'k8s-rollout-staging',
    folder: '/cloudops/apps',
    server: 'jenkins-01.cloudops.local',
    serverId: 'jenkins-01',
    type: 'pipeline',
    status: 'SUCCESS',
    health: 'sunny',
    lastRun: ago(180),
    duration: '3m 44s',
    branch: 'main',
    buildNum: 556,
    description: 'Rollout Helm en cluster staging.',
    scm: { type: 'Git', url: 'github.com/cloudops/k8s-manifests', branch: 'main', commit: 'ff102aa', author: 'k8s@cloudops.local' },
    upstream: ['deploy-api-staging'],
    downstream: [],
    parameters: [
      { key: 'CHART', default: 'api-gateway', description: 'Chart Helm' },
      { key: 'NAMESPACE', default: 'staging', description: 'Namespace' },
    ],
    stages: defaultStages('SUCCESS'),
    artifacts: [{ name: 'helm-release.yaml', size: '4 KB', path: 'manifests/release.yaml' }],
    tests: { total: 12, passed: 12, failed: 0, skipped: 0, duration: '45s' },
    triggers: ['Upstream deploy-api-staging'],
  },
  {
    name: 'security-scan-nightly',
    folder: '/cloudops/security',
    server: 'jenkins-02.cloudops.local',
    serverId: 'jenkins-02',
    type: 'freestyle',
    status: 'UNSTABLE',
    health: 'cloudy',
    lastRun: ago(720),
    duration: '15m 22s',
    branch: 'main',
    buildNum: 89,
    description: 'Escaneo OWASP y dependencias (job freestyle).',
    scm: { type: 'Git', url: 'github.com/cloudops/monorepo', branch: 'main', commit: '7712bcd', author: 'security@cloudops.local' },
    upstream: [],
    downstream: [],
    parameters: [{ key: 'SCAN_PROFILE', default: 'full', description: 'Perfil de escaneo' }],
    stages: [
      { name: 'Clone', status: 'SUCCESS', duration: '1m' },
      { name: 'SAST', status: 'UNSTABLE', duration: '8m' },
      { name: 'Dependency check', status: 'SUCCESS', duration: '6m' },
    ],
    artifacts: [{ name: 'scan-report.html', size: '1.8 MB', path: 'reports/scan.html' }],
    tests: { total: 0, passed: 0, failed: 0, skipped: 0, duration: '—' },
    triggers: ['Cron H 2 * * *'],
  },
  {
    name: 'backup-verify-vps',
    folder: '/cloudops/ops',
    server: 'jenkins-02.cloudops.local',
    serverId: 'jenkins-02',
    type: 'freestyle',
    status: 'SUCCESS',
    health: 'sunny',
    lastRun: ago(1440),
    duration: '1m 09s',
    branch: 'main',
    buildNum: 34,
    description: 'Verificación de backups en hosts VPS.',
    scm: { type: 'Git', url: 'github.com/cloudops/backup-scripts', branch: 'main', commit: '002fa11', author: 'ops@cloudops.local' },
    upstream: [],
    downstream: [],
    parameters: [{ key: 'HOST_GROUP', default: 'vps-monitoring', description: 'Grupo de hosts' }],
    stages: [
      { name: 'SSH verify', status: 'SUCCESS', duration: '40s' },
      { name: 'Checksum', status: 'SUCCESS', duration: '29s' },
    ],
    artifacts: [],
    tests: { total: 6, passed: 6, failed: 0, skipped: 0, duration: '12s' },
    triggers: ['Cron H 4 * * *'],
  },
]

export const demoJenkinsInventory = (): JenkinsInventory => {
  const jobItems = buildJobs()
  const builds = synthesizeWeeklyBuilds(jobItems)
  const servers: JenkinsServer[] = [
    { id: 'jenkins-01', name: 'jenkins-01.cloudops.local', url: 'https://jenkins-01.cloudops.local', version: '2.452.1', jobs: 4, status: 'online', executors: 4, busyExecutors: 2 },
    { id: 'jenkins-02', name: 'jenkins-02.cloudops.local', url: 'https://jenkins-02.cloudops.local', version: '2.452.1', jobs: 4, status: 'online', executors: 4, busyExecutors: 1 },
  ]
  const agents: JenkinsAgent[] = [
    { name: 'built-in', labels: ['master'], status: 'online', idle: false, currentJob: 'deploy-api-production #848' },
    { name: 'docker-agent-01', labels: ['docker', 'linux'], status: 'busy', idle: false, currentJob: 'deploy-api-production #848' },
    { name: 'docker-agent-02', labels: ['docker', 'linux'], status: 'online', idle: true },
    { name: 'terraform-agent', labels: ['terraform', 'aws'], status: 'online', idle: true },
    { name: 'vps-runner', labels: ['vps', 'ssh'], status: 'offline', idle: true },
  ]
  const queue: JenkinsQueueItem[] = [
    { id: 'q1', jobName: 'deploy-api-production', buildNum: 848, why: 'Iniciado por admin@cloudops.local', inQueueSince: 'Hace 2 min' },
    { id: 'q2', jobName: 'docker-build-frontend', buildNum: 1204, why: 'Esperando executor docker', inQueueSince: 'Hace 45 s' },
  ]
  return {
    demoMode: true,
    serverCount: servers.length,
    jobCount: jobItems.length,
    buildsRunning: 2,
    buildsSuccess: 142,
    buildsFailed: 3,
    queueSize: queue.length,
    executorBusy: 3,
    executorTotal: 8,
    diskUsagePercent: 62,
    version: '2.452.1 LTS',
    servers,
    agents,
    queue,
    folders: [
      { path: '/cloudops/apps', label: 'Aplicaciones' },
      { path: '/cloudops/infra', label: 'Infraestructura' },
      { path: '/cloudops/security', label: 'Seguridad' },
      { path: '/cloudops/ops', label: 'Operaciones' },
    ],
    jobItems,
    builds,
    logsByJob: Object.fromEntries(jobItems.map((j) => [j.name, logSnippet(j.name, j.status)])),
    plugins: [
      { name: 'Pipeline', version: '2.18', status: 'ok' },
      { name: 'Git', version: '5.2.1', status: 'ok' },
      { name: 'Docker Pipeline', version: '1.31', status: 'ok' },
      { name: 'Blue Ocean', version: '1.27.9', status: 'ok' },
      { name: 'Terraform', version: '1.0.10', status: 'warning' },
    ],
  }
}

export const normalizeJenkinsInventory = (raw: Record<string, unknown>): JenkinsInventory => {
  const demo = demoJenkinsInventory()
  const items = raw['jobItems'] as Record<string, unknown>[] | undefined
  if ((items?.length ?? 0) === 0) return demo

  const byName = new Map(demo.jobItems.map((j) => [j.name, j]))
  const mergedJobs: JenkinsJob[] = (items ?? []).map((row) => {
    const name = String(row['name'] ?? '')
    const base = byName.get(name)
    if (!base) {
      return {
        ...demo.jobItems[0],
        name,
        server: String(row['server'] ?? demo.servers[0].name),
        serverId: 'jenkins-01',
        status: String(row['status'] ?? 'UNKNOWN'),
        lastRun: String(row['lastRun'] ?? '—'),
        duration: String(row['duration'] ?? '—'),
        branch: String(row['branch'] ?? 'main'),
        buildNum: Number(row['buildNum'] ?? 1),
      }
    }
    return {
      ...base,
      status: String(row['status'] ?? base.status),
      lastRun: String(row['lastRun'] ?? base.lastRun),
      duration: String(row['duration'] ?? base.duration),
      branch: String(row['branch'] ?? base.branch),
      buildNum: Number(row['buildNum'] ?? base.buildNum),
      server: String(row['server'] ?? base.server),
    }
  })

  const builds = synthesizeWeeklyBuilds(mergedJobs)
  return {
    ...demo,
    ...raw,
    demoMode: Boolean(raw['demoMode'] ?? demo.demoMode),
    jobItems: mergedJobs,
    jobCount: mergedJobs.length,
    builds,
    logsByJob: { ...demo.logsByJob, ...(raw['logsByJob'] as Record<string, string> | undefined) },
    servers: (raw['servers'] as JenkinsServer[]) ?? demo.servers,
  }
}

/** Row shape for launch dialogs and inventory API merge */
export type JobRow = Record<string, unknown>

export const jobToRow = (job: JenkinsJob): JobRow => ({ ...job })
