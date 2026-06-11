import { CanMatchFn } from '@angular/router'

export const GITHUB_RESOURCE_SECTIONS = ['webhooks', 'branches', 'commits', 'pull-requests', 'deployments'] as const
export const GITLAB_RESOURCE_SECTIONS = ['webhooks', 'branches', 'commits', 'merge-requests', 'deployments'] as const

export type GithubResourceSection = (typeof GITHUB_RESOURCE_SECTIONS)[number]
export type GitlabResourceSection = (typeof GITLAB_RESOURCE_SECTIONS)[number]

export const isGithubResourceSection: CanMatchFn = (_, segments) => {
  const section = segments[segments.length - 1]?.path
  return GITHUB_RESOURCE_SECTIONS.includes(section as GithubResourceSection)
}

export const isGitlabResourceSection: CanMatchFn = (_, segments) => {
  const section = segments[segments.length - 1]?.path
  return GITLAB_RESOURCE_SECTIONS.includes(section as GitlabResourceSection)
}
