import { ConfigService } from '@nestjs/config'
import type { RepoOAuthProvider } from './repo-oauth-state.service'

/** Callback compartido con login OAuth — debe coincidir con la URL registrada en GitHub/GitLab. */
export const getRepoOAuthCallbackUri = (
  config: ConfigService,
  provider: RepoOAuthProvider,
): string => {
  const authUrl = (config.get<string>('AUTH_URL') ?? 'http://localhost:4200').replace(/\/$/, '')
  const callbackBase =
    config.get<string>('OAUTH_CALLBACK_URL')?.replace(/\/$/, '') ??
    `${authUrl}/api/v1/auth/oauth/callback`
  return `${callbackBase}/${provider}`
}
