import type { GitlabProject } from './gitlab-demo-catalog'
import {
  CLIENT_DEMO_GITLAB_MRS,
  CLIENT_DEMO_GITLAB_PIPELINES,
} from './gitlab-demo-catalog'

export type GitlabHostConfig = {
  baseUrl: string
}

export const DEFAULT_GITLAB_HOST: GitlabHostConfig = {
  baseUrl: 'https://gitlab.com',
}

export type GitlabQuickLink = {
  id: string
  label: string
  description: string
  icon: string
  path: string
  url: string
}

export const gitlabProjectBaseUrl = (
  project: GitlabProject,
  host: GitlabHostConfig = DEFAULT_GITLAB_HOST,
): string => `${host.baseUrl}/${project.fullPath}`

export const buildGitlabQuickLinks = (
  project: GitlabProject,
  host: GitlabHostConfig = DEFAULT_GITLAB_HOST,
): GitlabQuickLink[] => {
  const base = gitlabProjectBaseUrl(project, host)
  const branch = encodeURIComponent(project.defaultBranch)
  return [
    {
      id: 'code',
      label: 'Código',
      description: `Rama ${project.defaultBranch}`,
      icon: 'code',
      path: `/-/tree/${project.defaultBranch}`,
      url: `${base}/-/tree/${branch}`,
    },
    {
      id: 'pipelines',
      label: 'Pipelines',
      description: 'CI/CD · jobs y stages',
      icon: 'timeline',
      path: '/-/pipelines',
      url: `${base}/-/pipelines`,
    },
    {
      id: 'merge_requests',
      label: 'Merge Requests',
      description: 'MRs abiertas y mergeadas',
      icon: 'merge',
      path: '/-/merge_requests',
      url: `${base}/-/merge_requests`,
    },
    {
      id: 'issues',
      label: 'Issues',
      description: 'Incidencias y etiquetas',
      icon: 'bug_report',
      path: '/-/issues',
      url: `${base}/-/issues`,
    },
    {
      id: 'environments',
      label: 'Environments',
      description: 'Despliegues y tiers',
      icon: 'layers',
      path: '/-/deployments',
      url: `${base}/-/deployments`,
    },
    {
      id: 'ci_settings',
      label: 'CI/CD Settings',
      description: 'Variables, runners, reglas',
      icon: 'settings',
      path: '/-/settings/ci_cd',
      url: `${base}/-/settings/ci_cd`,
    },
  ]
}

export const projectPipelinePreview = (fullPath: string): Record<string, unknown> | undefined =>
  CLIENT_DEMO_GITLAB_PIPELINES.find((p) => p['projectPath'] === fullPath)

export const projectMrsPreview = (fullPath: string): Record<string, unknown>[] =>
  CLIENT_DEMO_GITLAB_MRS.filter((m) => m['projectPath'] === fullPath).slice(0, 3)

export type GitlabOpenDialogData = {
  project: GitlabProject
  hostUrl?: string
}
