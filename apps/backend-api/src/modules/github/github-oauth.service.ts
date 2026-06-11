import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getRepoOAuthCallbackUri } from '../../common/oauth/repo-oauth-callback.util'
import { RepoOAuthStateService } from '../../common/oauth/repo-oauth-state.service'

@Injectable()
export class GithubOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly state: RepoOAuthStateService,
  ) {}

  start = (userId: string, returnUrl?: string): { redirectUrl: string } => {
    const clientId = this.config.get<string>('GITHUB_CLIENT_ID')?.trim()
    if (!clientId) {
      throw new BadRequestException('GITHUB_CLIENT_ID no configurado en el servidor')
    }

    const safeReturnUrl = this.resolveReturnUrl(returnUrl, 'github')
    const redirectUri = this.getCallbackUri()
    const stateToken = this.state.sign(userId, 'github', safeReturnUrl)
    const scope = encodeURIComponent('read:user read:org repo')
    const redirectUrl =
      `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
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
    const { returnUrl } = this.state.verify(state, 'github')

    const clientId = this.config.get<string>('GITHUB_CLIENT_ID')!
    const clientSecret = this.config.get<string>('GITHUB_CLIENT_SECRET')!
    const redirectUri = this.getCallbackUri()

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      throw new BadRequestException('No se pudo validar el código de GitHub')
    }

    const tokens = (await tokenRes.json()) as { access_token?: string; error?: string }
    if (!tokens.access_token) {
      throw new BadRequestException(tokens.error ?? 'Token de GitHub no recibido')
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Spendlyx',
      },
    })

    if (!userRes.ok) {
      throw new BadRequestException('No se pudo leer el perfil de GitHub')
    }

    const user = (await userRes.json()) as { login?: string; name?: string }
    const username = user.login ?? user.name ?? 'github-user'
    const hash =
      `repo_token=${encodeURIComponent(tokens.access_token)}` +
      `&username=${encodeURIComponent(username)}` +
      `&auth_type=oauth`

    return { redirectUrl: `${returnUrl}#${hash}` }
  }

  private getCallbackUri = (): string => getRepoOAuthCallbackUri(this.config, 'github')

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
