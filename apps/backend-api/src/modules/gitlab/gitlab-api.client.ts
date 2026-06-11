import { Injectable, Logger } from '@nestjs/common'

export type GitlabUserInfo = {
  id: number
  username: string
  name: string
  avatar_url: string
}

export type GitlabProjectApi = {
  id: number
  name: string
  path_with_namespace: string
  description: string | null
  default_branch: string
  visibility: string
  web_url: string
  archived: boolean
  last_activity_at: string
}

export type GitlabBranchApi = {
  name: string
  protected: boolean
  default?: boolean
  commit?: {
    id?: string
    title?: string
    message?: string
    committed_date?: string
    author_name?: string
  }
}

export type GitlabCommitApi = {
  id: string
  title: string
  message: string
  author_name: string
  committed_date: string
}

export type GitlabMergeRequestApi = {
  iid: number
  title: string
  state: string
  author: { username: string } | null
  source_branch: string
  target_branch: string
  created_at: string
  web_url: string
}

export type GitlabHookApi = {
  id: number
  url: string
  push_events: boolean
  merge_requests_events: boolean
  pipeline_events: boolean
  enable_ssl_verification: boolean
}

export type GitlabPipelineApi = {
  id: number
  status: string
  ref: string
  sha: string
  created_at: string
  updated_at: string
  web_url: string
}

export type GitlabDeploymentApi = {
  id: number
  status: string
  ref: string
  sha: string
  created_at: string
  updated_at: string
  environment?: { name: string }
}

@Injectable()
export class GitlabApiClient {
  private readonly logger = new Logger(GitlabApiClient.name)

  apiBase = (baseUrl?: string | null): string => {
    const trimmed = (baseUrl?.trim() || 'https://gitlab.com').replace(/\/$/, '')
    return `${trimmed}/api/v4`
  }

  validateToken = async (
    token: string,
    baseUrl?: string | null,
    authType?: string,
  ): Promise<{
    valid: boolean
    user: GitlabUserInfo | null
    scopes: string[]
    projectCount: number
    error?: string
  }> => {
    try {
      const res = await fetch(`${this.apiBase(baseUrl)}/user`, {
        headers: this.headers(token, authType),
      })
      if (!res.ok) {
        return { valid: false, user: null, scopes: [], projectCount: 0, error: `HTTP ${res.status}` }
      }
      const user = (await res.json()) as GitlabUserInfo
      const projects = await this.listProjects(token, baseUrl, 1, 1, authType)
      return {
        valid: true,
        user,
        scopes: ['api', 'read_api', 'read_repository'],
        projectCount: projects.total,
      }
    } catch (err) {
      this.logger.warn(`GitLab validate failed: ${String(err)}`)
      return { valid: false, user: null, scopes: [], projectCount: 0, error: 'Error de conexión con GitLab' }
    }
  }

  listProjects = async (
    token: string,
    baseUrl?: string | null,
    page = 1,
    perPage = 100,
    authType?: string,
  ): Promise<{ items: GitlabProjectApi[]; total: number }> => {
    const url = `${this.apiBase(baseUrl)}/projects?membership=true&simple=true&per_page=${perPage}&page=${page}&order_by=last_activity_at`
    const res = await fetch(url, { headers: this.headers(token, authType) })
    if (!res.ok) throw new Error(`GitLab projects HTTP ${res.status}`)
    const items = (await res.json()) as GitlabProjectApi[]
    const totalHeader = res.headers.get('x-total') ?? res.headers.get('X-Total')
    const total = totalHeader ? parseInt(totalHeader, 10) : (page - 1) * perPage + items.length
    return { items, total: Math.max(total, items.length) }
  }

  listAllProjects = async (
    token: string,
    baseUrl?: string | null,
    maxPages = 5,
    authType?: string,
  ): Promise<GitlabProjectApi[]> => {
    const all: GitlabProjectApi[] = []
    for (let page = 1; page <= maxPages; page++) {
      const { items } = await this.listProjects(token, baseUrl, page, 100, authType)
      if (!items.length) break
      all.push(...items)
      if (items.length < 100) break
    }
    return all
  }

  listBranches = async (
    token: string,
    projectId: number,
    baseUrl?: string | null,
    authType?: string,
  ): Promise<GitlabBranchApi[]> => {
    const url = `${this.apiBase(baseUrl)}/projects/${encodeURIComponent(String(projectId))}/repository/branches?per_page=100`
    const res = await fetch(url, { headers: this.headers(token, authType) })
    if (!res.ok) throw new Error(`GitLab branches HTTP ${res.status}`)
    return (await res.json()) as GitlabBranchApi[]
  }

  listCommits = async (
    token: string,
    projectId: number,
    baseUrl?: string | null,
    ref?: string,
    authType?: string,
    perPage = 30,
  ): Promise<GitlabCommitApi[]> => {
    const refParam = ref ? `&ref_name=${encodeURIComponent(ref)}` : ''
    const url = `${this.apiBase(baseUrl)}/projects/${encodeURIComponent(String(projectId))}/repository/commits?per_page=${perPage}${refParam}`
    const res = await fetch(url, { headers: this.headers(token, authType) })
    if (!res.ok) throw new Error(`GitLab commits HTTP ${res.status}`)
    return (await res.json()) as GitlabCommitApi[]
  }

  listMergeRequests = async (
    token: string,
    projectId: number,
    baseUrl?: string | null,
    authType?: string,
    perPage = 30,
  ): Promise<GitlabMergeRequestApi[]> => {
    const url = `${this.apiBase(baseUrl)}/projects/${encodeURIComponent(String(projectId))}/merge_requests?state=all&per_page=${perPage}&order_by=updated_at`
    const res = await fetch(url, { headers: this.headers(token, authType) })
    if (!res.ok) throw new Error(`GitLab merge requests HTTP ${res.status}`)
    return (await res.json()) as GitlabMergeRequestApi[]
  }

  listProjectHooks = async (
    token: string,
    projectId: number,
    baseUrl?: string | null,
    authType?: string,
  ): Promise<GitlabHookApi[]> => {
    const url = `${this.apiBase(baseUrl)}/projects/${encodeURIComponent(String(projectId))}/hooks`
    const res = await fetch(url, { headers: this.headers(token, authType) })
    if (res.status === 403 || res.status === 404) return []
    if (!res.ok) throw new Error(`GitLab hooks HTTP ${res.status}`)
    return (await res.json()) as GitlabHookApi[]
  }

  listDeployments = async (
    token: string,
    projectId: number,
    baseUrl?: string | null,
    authType?: string,
    perPage = 20,
  ): Promise<GitlabDeploymentApi[]> => {
    const url = `${this.apiBase(baseUrl)}/projects/${encodeURIComponent(String(projectId))}/deployments?per_page=${perPage}&order_by=updated_at&sort=desc`
    const res = await fetch(url, { headers: this.headers(token, authType) })
    if (!res.ok) {
      const pipelines = await this.listPipelines(token, projectId, baseUrl, authType, perPage)
      return pipelines.map((p) => ({
        id: p.id,
        status: p.status,
        ref: p.ref,
        sha: p.sha,
        created_at: p.created_at,
        updated_at: p.updated_at,
        environment: { name: p.ref },
      }))
    }
    return (await res.json()) as GitlabDeploymentApi[]
  }

  listPipelines = async (
    token: string,
    projectId: number,
    baseUrl?: string | null,
    authType?: string,
    perPage = 20,
  ): Promise<GitlabPipelineApi[]> => {
    const url = `${this.apiBase(baseUrl)}/projects/${encodeURIComponent(String(projectId))}/pipelines?per_page=${perPage}&order_by=updated_at&sort=desc`
    const res = await fetch(url, { headers: this.headers(token, authType) })
    if (!res.ok) throw new Error(`GitLab pipelines HTTP ${res.status}`)
    return (await res.json()) as GitlabPipelineApi[]
  }

  createPipeline = async (
    token: string,
    projectId: number,
    ref: string,
    baseUrl?: string | null,
    authType?: string,
  ): Promise<GitlabPipelineApi> => {
    const url = `${this.apiBase(baseUrl)}/projects/${encodeURIComponent(String(projectId))}/pipeline`
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...this.headers(token, authType), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref }),
    })
    if (!res.ok) throw new Error(`GitLab create pipeline HTTP ${res.status}`)
    return (await res.json()) as GitlabPipelineApi
  }

  getPipeline = async (
    token: string,
    projectId: number,
    pipelineId: number,
    baseUrl?: string | null,
    authType?: string,
  ): Promise<GitlabPipelineApi> => {
    const url = `${this.apiBase(baseUrl)}/projects/${encodeURIComponent(String(projectId))}/pipelines/${pipelineId}`
    const res = await fetch(url, { headers: this.headers(token, authType) })
    if (!res.ok) throw new Error(`GitLab pipeline HTTP ${res.status}`)
    return (await res.json()) as GitlabPipelineApi
  }

  private headers = (token: string, authType?: string): Record<string, string> => {
    if (authType === 'oauth') {
      return {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Spendlyx-CloudOps',
      }
    }
    return {
      'PRIVATE-TOKEN': token,
      'User-Agent': 'Spendlyx-CloudOps',
    }
  }
}
