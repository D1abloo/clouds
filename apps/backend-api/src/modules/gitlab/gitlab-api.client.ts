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
  ): Promise<{
    valid: boolean
    user: GitlabUserInfo | null
    scopes: string[]
    projectCount: number
    error?: string
  }> => {
    try {
      const res = await fetch(`${this.apiBase(baseUrl)}/user`, {
        headers: this.headers(token),
      })
      if (!res.ok) {
        return { valid: false, user: null, scopes: [], projectCount: 0, error: `HTTP ${res.status}` }
      }
      const user = (await res.json()) as GitlabUserInfo
      const projects = await this.listProjects(token, baseUrl, 1, 1)
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
  ): Promise<{ items: GitlabProjectApi[]; total: number }> => {
    const url = `${this.apiBase(baseUrl)}/projects?membership=true&simple=true&per_page=${perPage}&page=${page}&order_by=last_activity_at`
    const res = await fetch(url, { headers: this.headers(token) })
    if (!res.ok) throw new Error(`GitLab projects HTTP ${res.status}`)
    const items = (await res.json()) as GitlabProjectApi[]
    const totalHeader = res.headers.get('x-total') ?? res.headers.get('X-Total')
    const total = totalHeader ? parseInt(totalHeader, 10) : (page - 1) * perPage + items.length
    return { items, total: Math.max(total, items.length) }
  }

  listAllProjects = async (token: string, baseUrl?: string | null, maxPages = 5): Promise<GitlabProjectApi[]> => {
    const all: GitlabProjectApi[] = []
    for (let page = 1; page <= maxPages; page++) {
      const { items } = await this.listProjects(token, baseUrl, page, 100)
      if (!items.length) break
      all.push(...items)
      if (items.length < 100) break
    }
    return all
  }

  private headers = (token: string): Record<string, string> => ({
    'PRIVATE-TOKEN': token,
    'User-Agent': 'Spendlyx-CloudOps',
  })
}
