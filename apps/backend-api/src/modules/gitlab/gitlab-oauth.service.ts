import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getRepoOAuthCallbackUri } from '../../common/oauth/repo-oauth-callback.util'
import { RepoOAuthStateService } from '../../common/oauth/repo-oauth-state.service'

@Injectable()
export class GitlabOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly state: RepoOAuthStateService,
  ) {}

  start = (userId: string, returnUrl?: string): { redirectUrl: string } => {
    const clientId = this.config.get<string>('GITLAB_CLIENT_ID')?.trim()
    if (!clientId) {
      throw new BadRequestException('GITLAB_CLIENT_ID no configurado en el servidor')
    }

    const safeReturnUrl = this.resolveReturnUrl(returnUrl, 'gitlab')
    const redirectUri = this.getCallbackUri()
    const stateToken = this.state.sign(userId, 'gitlab', safeReturnUrl)
    const scope = encodeURIComponent('read_user read_api read_repository')
    const redirectUrl =
      `https://gitlab.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${encodeURIComponent(stateToken)}`

    return { redirectUrl }
  }

  handleCallback = async (
    code: string,
    state: string,
  ): Promise<{ redirectUrl: string }> => {
    if (!code?.trim()) {
      throw new BadRequestException('Código OAuth ausente')
    }
    const { returnUrl } = this.state.verify(state, 'gitlab')

    const clientId = this.config.get<string>('GITLAB_CLIENT_ID')!
    const clientSecret = this.config.get<string>('GITLAB_CLIENT_SECRET')!
    const redirectUri = this.getCallbackUri()

    const tokenRes = await fetch('https://gitlab.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      throw new BadRequestException('No se pudo validar el código de GitLab')
    }

    const tokens = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string }
    if (!tokens.access_token) {
      throw new BadRequestException(tokens.error_description ?? tokens.error ?? 'Token de GitLab no recibido')
    }

    const userRes = await fetch('https://gitlab.com/api/v4/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'User-Agent': 'Spendlyx-CloudOps',
      },
    })

    if (!userRes.ok) {
      throw new BadRequestException('No se pudo leer el perfil de GitLab')
    }

    const user = (await userRes.json()) as { username?: string; name?: string }
    const username = user.username ?? user.name ?? 'gitlab-user'
    const hash =
      `repo_token=${encodeURIComponent(tokens.access_token)}` +
      `&username=${encodeURIComponent(username)}` +
      `&auth_type=oauth`

    return { redirectUrl: `${returnUrl}#${hash}` }
  }

  private getCallbackUri = (): string => getRepoOAuthCallbackUri(this.config, 'gitlab')

  private resolveReturnUrl = (returnUrl: string | undefined, provider: 'github' | 'gitlab'): string => {
    const appUrl = (this.config.get<string>('APP_URL') ?? this.config.get<string>('AUTH_URL', 'http://localhost:4200')).replace(
      /\/$/,
      '',
    )
    const fallback = `${appUrl}/admin/configuracion/integraciones/${provider}/conectar`
    const candidate = returnUrl?.trim() || fallback
    if (!candidate.startsWith(appUrl)) {
      return fallback
    }
    return candidate
  }
}
