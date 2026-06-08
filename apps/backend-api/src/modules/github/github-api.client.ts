import { Injectable, Logger } from '@nestjs/common'

export type GithubUserInfo = {
  login: string
  avatar_url: string
  name?: string | null
}

export type GithubRepoApi = {
  id: number
  name: string
  full_name: string
  description: string | null
  default_branch: string
  language: string | null
  stargazers_count: number
  private: boolean
  archived: boolean
  html_url: string
  updated_at: string
}

@Injectable()
export class GithubApiClient {
  private readonly logger = new Logger(GithubApiClient.name)

  apiBase = (baseUrl?: string | null): string => {
    const trimmed = baseUrl?.trim().replace(/\/$/, '')
    if (trimmed && !trimmed.includes('github.com')) {
      return `${trimmed}/api/v3`
    }
    return 'https://api.github.com'
  }

  validateToken = async (
    token: string,
    baseUrl?: string | null,
  ): Promise<{
    valid: boolean
    user: GithubUserInfo | null
    scopes: string[]
    repoCount: number
    error?: string
  }> => {
    try {
      const res = await fetch(`${this.apiBase(baseUrl)}/user`, {
        headers: this.headers(token),
      })
      const scopesHeader = res.headers.get('x-oauth-scopes') ?? ''
      const scopes = scopesHeader
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (!res.ok) {
        return { valid: false, user: null, scopes, repoCount: 0, error: `HTTP ${res.status}` }
      }
      const user = (await res.json()) as GithubUserInfo
      const { total } = await this.listRepos(token, baseUrl, 1, 1)
      return { valid: true, user, scopes, repoCount: total }
    } catch (err) {
      this.logger.warn(`GitHub validate failed: ${String(err)}`)
      return { valid: false, user: null, scopes: [], repoCount: 0, error: 'Error de conexión con GitHub' }
    }
  }

  listRepos = async (
    token: string,
    baseUrl?: string | null,
    page = 1,
    perPage = 100,
  ): Promise<{ items: GithubRepoApi[]; total: number }> => {
    const url = `${this.apiBase(baseUrl)}/user/repos?per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member&sort=updated`
    const res = await fetch(url, { headers: this.headers(token) })
    if (!res.ok) throw new Error(`GitHub repos HTTP ${res.status}`)
    const items = (await res.json()) as GithubRepoApi[]
    const linkHeader = res.headers.get('link') ?? ''
    const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/)
    const total = lastMatch
      ? parseInt(lastMatch[1], 10) * perPage
      : (page - 1) * perPage + items.length
    return { items, total: Math.max(total, items.length) }
  }

  listAllRepos = async (token: string, baseUrl?: string | null, maxPages = 5): Promise<GithubRepoApi[]> => {
    const all: GithubRepoApi[] = []
    for (let page = 1; page <= maxPages; page++) {
      const { items } = await this.listRepos(token, baseUrl, page, 100)
      if (!items.length) break
      all.push(...items)
      if (items.length < 100) break
    }
    return all
  }

  private headers = (token: string): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Spendlyx-CloudOps',
  })
}
