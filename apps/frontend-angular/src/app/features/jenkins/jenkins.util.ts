import type { JenkinsJob, JenkinsInventory, JenkinsServer, JenkinsAgent, JenkinsQueueItem, JenkinsFolder, JenkinsBuild, JenkinsPlugin, CreateJenkinsJobForm } from './jenkins.models'
import { isProdReadinessComplete, prodReadinessFromCreateForm } from './jenkins-prod-readiness'
import { emptyJenkinsInventory } from '../../core/demo/pro-empty.data'

export type JobRow = Record<string, unknown>

export const jobToRow = (job: JenkinsJob): JobRow => ({ ...job })

export const createJobFromForm = (
  form: CreateJenkinsJobForm,
  servers: JenkinsServer[],
  scmValidated = false,
): JenkinsJob => {
  const server = servers.find((s) => s.id === form.serverId) ?? servers[0]
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
    health: 'sunny',
    lastRun: 'Aún no ejecutado',
    duration: '—',
    branch: form.branch,
    buildNum: 0,
    description: form.description,
    scm: { type: 'Git', url: form.scmUrl, branch: form.branch, commit: '—', author: '' },
    upstream: [],
    downstream: [],
    parameters: [],
    stages: [],
    artifacts: [],
    tests: { total: 0, passed: 0, failed: 0, skipped: 0, duration: '—' },
    triggers: [],
  }
}

export const normalizeJenkinsInventory = (raw: Record<string, unknown>): JenkinsInventory => {
  const items = raw['jobItems'] as Record<string, unknown>[] | undefined
  if ((items?.length ?? 0) === 0) return emptyJenkinsInventory() as unknown as JenkinsInventory
  const jobItems: JenkinsJob[] = (items ?? []).map((row) => ({
    name: String(row['name'] ?? ''),
    folder: String(row['folder'] ?? '/'),
    server: String(row['server'] ?? '—'),
    serverId: String(row['serverId'] ?? ''),
    type: (row['type'] as JenkinsJob['type']) ?? 'pipeline',
    status: String(row['status'] ?? 'UNKNOWN'),
    health: (row['health'] as JenkinsJob['health']) ?? 'cloudy',
    lastRun: String(row['lastRun'] ?? '—'),
    duration: String(row['duration'] ?? '—'),
    branch: String(row['branch'] ?? 'main'),
    buildNum: Number(row['buildNum'] ?? 0),
    description: String(row['description'] ?? ''),
    scm: (row['scm'] as JenkinsJob['scm']) ?? { type: 'git', url: '', branch: 'main', commit: '', author: '' },
    upstream: [],
    downstream: [],
    parameters: [],
    stages: [],
    artifacts: [],
    tests: { total: 0, passed: 0, failed: 0, skipped: 0, duration: '—' },
    triggers: [],
  }))
  return {
    ...emptyJenkinsInventory(),
    ...raw,
    demoMode: false,
    serverCount: Number(raw['serverCount'] ?? 0),
    jobCount: jobItems.length,
    jobItems,
    servers: (raw['servers'] as JenkinsServer[]) ?? [],
    agents: (raw['agents'] as JenkinsAgent[]) ?? [],
    queue: (raw['queue'] as JenkinsQueueItem[]) ?? [],
    folders: (raw['folders'] as JenkinsFolder[]) ?? [],
    builds: (raw['builds'] as JenkinsBuild[]) ?? [],
    logsByJob: (raw['logsByJob'] as Record<string, string>) ?? {},
    plugins: (raw['plugins'] as JenkinsPlugin[]) ?? [],
  } as JenkinsInventory
}
