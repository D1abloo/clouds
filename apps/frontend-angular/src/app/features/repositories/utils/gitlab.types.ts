export type GitlabAccount = {
  id: string
  label: string
  connectionName?: string
  username: string
  status: string
  statusLabel: string
  authType?: string
  baseUrl?: string
  lastError?: string | null
  lastSyncAt: string
  repoCount?: number
  avatarUrl?: string | null
  demoMode: boolean
}

export type GitlabProject = {
  id: string
  name: string
  fullPath: string
  description: string
  defaultBranch: string
  language: string
  visibility: string
  group: string
  subgroup?: string
  stars: number
  forks: number
  updatedAt: string
  isDemo: boolean
}

export type GitlabGroup = {
  id: string
  name: string
  path: string
  projects: number
  subgroups: number
}
