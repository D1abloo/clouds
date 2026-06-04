import type { GitlabProject } from './gitlab-demo-catalog'

export type GitlabDrawerOverview = {
  healthScore: number
  healthLabel: string
  pipelineStatus: string
  pipelineBadge: string
  metrics: { label: string; value: string | number; icon: string }[]
  pipelines: { name: string; status: string; duration: string }[]
  activity: { title: string; detail: string; when: string }[]
}

export const buildGitlabDrawerOverview = (
  project: GitlabProject,
  counts: { mrs: number; pipelines: number; runners: number; webhooks: number },
): GitlabDrawerOverview => ({
  healthScore: 78,
  healthLabel: 'Estable',
  pipelineStatus: 'Último pipeline exitoso',
  pipelineBadge: 'SUCCESS',
  metrics: [
    { label: 'Merge Requests', value: counts.mrs, icon: 'call_merge' },
    { label: 'Pipelines', value: counts.pipelines, icon: 'timeline' },
    { label: 'Runners', value: counts.runners, icon: 'directions_run' },
    { label: 'Webhooks', value: counts.webhooks, icon: 'webhook' },
    { label: 'Grupo', value: project.group, icon: 'groups' },
    { label: 'Forks', value: project.forks, icon: 'fork_right' },
  ],
  pipelines: [
    { name: 'test', status: 'success', duration: '2m 10s' },
    { name: 'build', status: 'success', duration: '3m 40s' },
    { name: 'deploy', status: 'running', duration: '1m 05s' },
  ],
  activity: [
    { title: 'Pipeline completado', detail: project.fullPath, when: 'hace 20 min' },
    { title: 'Merge Request actualizado', detail: '!42 en revisión', when: 'hace 1 h' },
    { title: 'Runner asignado', detail: 'shared-runner-01', when: 'hace 3 h' },
  ],
})
