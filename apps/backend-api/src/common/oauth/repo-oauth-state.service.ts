import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

export type RepoOAuthProvider = 'github' | 'gitlab'

export type RepoOAuthStatePayload = {
  sub: string
  purpose: string
  returnUrl: string
}

@Injectable()
export class RepoOAuthStateService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  sign = (userId: string, provider: RepoOAuthProvider, returnUrl: string): string =>
    this.jwt.sign(
      { sub: userId, purpose: `repo_oauth_${provider}`, returnUrl },
      { expiresIn: '10m', secret: this.getSecret() },
    )

  verify = (state: string, provider: RepoOAuthProvider): { userId: string; returnUrl: string } => {
    try {
      const payload = this.jwt.verify<RepoOAuthStatePayload>(state, { secret: this.getSecret() })
      if (payload.purpose !== `repo_oauth_${provider}` || !payload.sub || !payload.returnUrl) {
        throw new UnauthorizedException('Estado OAuth inválido')
      }
      return { userId: payload.sub, returnUrl: payload.returnUrl }
    } catch {
      throw new UnauthorizedException('Estado OAuth inválido o expirado')
    }
  }

  private getSecret = (): string =>
    this.config.get<string>('JWT_SECRET') ??
    this.config.get<string>('AUTH_SECRET') ??
    'change_me'
}
