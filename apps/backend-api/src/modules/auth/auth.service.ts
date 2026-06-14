import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../common/prisma/prisma.service'
import { LoginDto, RegisterDto } from './dto/login.dto'
import { AuditService } from '../audit/audit.service'
import { resolveUserPermissions } from '../../common/rbac/rbac.resolve'
import { OrganizationScopeService } from '../../common/organization/organization-scope.service'
import { EmailVerificationService } from './email-verification.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
    private orgScope: OrganizationScopeService,
    private emailVerification: EmailVerificationService,
  ) {}

  private async buildAuthPayload(userId: string, email: string, roles: string[]) {
    const [permissions, scope] = await Promise.all([
      resolveUserPermissions(this.prisma, userId),
      this.orgScope.resolveForUser(userId),
    ])
    return {
      sub: userId,
      email,
      roles,
      permissions,
      organizationIds: scope.organizationIds,
      projectIds: scope.projectIds,
    }
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, deletedAt: null },
      include: {
        userRoles: { include: { role: true } },
      },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales incorrectas')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedException('Credenciales incorrectas')
    }

    if (!this.emailVerification.isEmailVerified(user)) {
      throw new UnauthorizedException({
        message:
          'Tu cuenta aún no ha sido verificada. Revisa tu correo o solicita un nuevo enlace de validación.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      })
    }

    await this.orgScope.ensurePersonalWorkspace(user.id, {
      displayName: user.name ?? undefined,
      companyName: user.company ?? user.name ?? undefined,
    })

    const roles = user.userRoles.map((ur) => ur.role.name)
    const payload = await this.buildAuthPayload(user.id, user.email, roles)

    await this.audit.create({
      userId: user.id,
      action: 'login',
      resource: 'auth',
      ipAddress,
    })

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        permissions: payload.permissions,
        organizationIds: payload.organizationIds,
      },
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) {
      throw new UnauthorizedException('Email already registered')
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const viewerRole = await this.prisma.role.findUnique({ where: { name: 'solo_lectura' } })

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        userRoles: viewerRole
          ? { create: [{ roleId: viewerRole.id }] }
          : undefined,
      },
    })

    return { id: user.id, email: user.email, name: user.name }
  }

  async configureMfa(userId: string, enabled: boolean, secretRef?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: enabled,
        mfaSecretRef: enabled ? secretRef ?? `vault:mfa/${userId}` : null,
      },
      select: { id: true, email: true, mfaEnabled: true },
    })
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null, isActive: true },
      include: { userRoles: { include: { role: true } } },
    })
    if (!user) return null
    const roles = user.userRoles.map((ur) => ur.role.name)
    return this.buildAuthPayload(user.id, user.email, roles)
  }

  async oauthCallback(provider: string, code: string, ipAddress?: string) {
    const normalized = provider.toLowerCase()
    if (normalized !== 'google' && normalized !== 'github') {
      throw new UnauthorizedException('Proveedor OAuth no soportado')
    }
    if (!code?.trim()) {
      throw new UnauthorizedException('Código OAuth ausente')
    }

    const demoMode = this.config.get<string>('DEMO_MODE', 'false') === 'true'
    const clientId =
      normalized === 'google'
        ? this.config.get<string>('GOOGLE_CLIENT_ID')
        : this.config.get<string>('GITHUB_CLIENT_ID')
    const clientSecret =
      normalized === 'google'
        ? this.config.get<string>('GOOGLE_CLIENT_SECRET')
        : this.config.get<string>('GITHUB_CLIENT_SECRET')

    if (!demoMode) {
      if (!clientId || !clientSecret) {
        throw new UnauthorizedException(`OAuth ${normalized} no está configurado en modo PRO`)
      }
      const profile =
        normalized === 'google'
          ? await this.exchangeGoogleProfile(code)
          : await this.exchangeGithubProfile(code)
      return this.issueOAuthSession(profile.email, normalized, profile.providerAccountId, ipAddress, profile.name)
    }

    const fallbackEmail = normalized === 'google' ? 'admin@cloudops.local' : 'demo@cloudops.local'
    return this.issueOAuthSession(fallbackEmail, normalized, code, ipAddress)
  }

  private getOAuthRedirectUri(provider: string): string {
    const authUrl = this.config.get<string>('AUTH_URL', 'http://localhost:4200').replace(/\/$/, '')
    const callbackBase =
      this.config.get<string>('OAUTH_CALLBACK_URL')?.replace(/\/$/, '') ??
      `${authUrl}/api/v1/auth/oauth/callback`
    return `${callbackBase}/${provider}`
  }

  private async exchangeGoogleProfile(code: string): Promise<{
    email: string
    name: string
    providerAccountId: string
  }> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')!
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET')!
    const redirectUri = this.getOAuthRedirectUri('google')

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      throw new UnauthorizedException('No se pudo validar el código de Google')
    }

    const tokens = (await tokenRes.json()) as { access_token?: string }
    if (!tokens.access_token) {
      throw new UnauthorizedException('Token de Google no recibido')
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!profileRes.ok) {
      throw new UnauthorizedException('No se pudo leer el perfil de Google')
    }

    const profile = (await profileRes.json()) as { id?: string; email?: string; name?: string }
    if (!profile.email || !profile.id) {
      throw new UnauthorizedException('Google no devolvió email verificado')
    }

    return {
      email: profile.email,
      name: profile.name ?? profile.email.split('@')[0],
      providerAccountId: profile.id,
    }
  }

  private async exchangeGithubProfile(code: string): Promise<{
    email: string
    name: string
    providerAccountId: string
  }> {
    const clientId = this.config.get<string>('GITHUB_CLIENT_ID')!
    const clientSecret = this.config.get<string>('GITHUB_CLIENT_SECRET')!
    const redirectUri = this.getOAuthRedirectUri('github')

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
      throw new UnauthorizedException('No se pudo validar el código de GitHub')
    }

    const tokens = (await tokenRes.json()) as { access_token?: string; error?: string }
    if (!tokens.access_token) {
      throw new UnauthorizedException(tokens.error ?? 'Token de GitHub no recibido')
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Spendlyx',
      },
    })

    if (!userRes.ok) {
      throw new UnauthorizedException('No se pudo leer el perfil de GitHub')
    }

    const user = (await userRes.json()) as { id?: number; login?: string; name?: string; email?: string | null }
    let email = user.email?.trim() ?? ''

    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Spendlyx',
        },
      })
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as Array<{ email: string; primary?: boolean; verified?: boolean }>
        email =
          emails.find((entry) => entry.primary && entry.verified)?.email ??
          emails.find((entry) => entry.verified)?.email ??
          emails[0]?.email ??
          ''
      }
    }

    if (!email || !user.id) {
      throw new UnauthorizedException('GitHub no devolvió email verificado')
    }

    return {
      email,
      name: user.name ?? user.login ?? email.split('@')[0],
      providerAccountId: String(user.id),
    }
  }

  private async issueOAuthSession(
    email: string,
    provider: string,
    providerAccountId: string,
    ipAddress?: string,
    displayName?: string,
  ) {
    let user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: { userRoles: { include: { role: true } } },
    })

    if (!user) {
      const passwordHash = await bcrypt.hash(`oauth-${provider}-${Date.now()}`, 12)
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: displayName ?? email.split('@')[0],
          emailVerifiedAt: new Date(),
        },
        include: { userRoles: { include: { role: true } } },
      })
      await this.orgScope.ensurePersonalWorkspace(user.id, {
        displayName: displayName ?? email.split('@')[0],
        companyName: displayName ?? email.split('@')[0],
      })
      user = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { userRoles: { include: { role: true } } },
      })
    } else {
      if (!user.emailVerifiedAt) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { emailVerifiedAt: new Date() },
          include: { userRoles: { include: { role: true } } },
        })
      } else if (displayName && displayName !== user.name) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { name: displayName },
          include: { userRoles: { include: { role: true } } },
        })
      }
      await this.orgScope.ensurePersonalWorkspace(user.id, {
        displayName: user.name ?? displayName,
        companyName: user.company ?? user.name ?? undefined,
      })
      user = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { userRoles: { include: { role: true } } },
      })
    }

    await this.prisma.oAuthAccount.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      create: { userId: user.id, provider, providerAccountId },
      update: { userId: user.id },
    })

    const roles = user.userRoles.map((ur) => ur.role.name)
    const payload = await this.buildAuthPayload(user.id, user.email, roles)

    await this.audit.create({
      userId: user.id,
      action: 'oauth_login',
      resource: 'auth',
      ipAddress,
      metadata: { provider },
    })

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        permissions: payload.permissions,
        organizationIds: payload.organizationIds,
      },
      provider,
    }
  }
}
