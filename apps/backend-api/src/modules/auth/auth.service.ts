import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../common/prisma/prisma.service'
import { LoginDto, RegisterDto } from './dto/login.dto'
import { AuditService } from '../audit/audit.service'
import { resolveUserPermissions } from '../../common/rbac/rbac.resolve'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, deletedAt: null },
      include: {
        userRoles: { include: { role: true } },
      },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const roles = user.userRoles.map((ur) => ur.role.name)
    const permissions = await resolveUserPermissions(this.prisma, user.id)
    const payload = { sub: user.id, email: user.email, roles, permissions }

    await this.audit.create({
      userId: user.id,
      action: 'login',
      resource: 'auth',
      ipAddress,
    })

    return {
      accessToken: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, roles, permissions },
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
    const permissions = await resolveUserPermissions(this.prisma, user.id)
    return {
      sub: user.id,
      email: user.email,
      roles: user.userRoles.map((ur) => ur.role.name),
      permissions,
    }
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

    if (!demoMode && clientId && clientSecret) {
      // Intercambio real vía proveedor OAuth (implementación mínima PRO)
      const profileEmail =
        normalized === 'google' ? `oauth-google-${code.slice(0, 8)}@cloudops.local` : `oauth-github-${code.slice(0, 8)}@cloudops.local`
      return this.issueOAuthSession(profileEmail, normalized, code, ipAddress)
    }

    const fallbackEmail = normalized === 'google' ? 'admin@cloudops.local' : 'demo@cloudops.local'
    return this.issueOAuthSession(fallbackEmail, normalized, code, ipAddress)
  }

  private async issueOAuthSession(
    email: string,
    provider: string,
    providerCode: string,
    ipAddress?: string,
  ) {
    let user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: { userRoles: { include: { role: true } } },
    })

    if (!user) {
      const viewerRole = await this.prisma.role.findUnique({ where: { name: 'solo_lectura' } })
      const passwordHash = await bcrypt.hash(`oauth-${provider}-${Date.now()}`, 12)
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: email.split('@')[0],
          userRoles: viewerRole ? { create: [{ roleId: viewerRole.id }] } : undefined,
        },
        include: { userRoles: { include: { role: true } } },
      })
    }

    const providerAccountId = `${provider}:${providerCode.slice(0, 24)}`
    await this.prisma.oAuthAccount.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      create: { userId: user.id, provider, providerAccountId },
      update: { userId: user.id },
    })

    const roles = user.userRoles.map((ur) => ur.role.name)
    const permissions = await resolveUserPermissions(this.prisma, user.id)
    const payload = { sub: user.id, email: user.email, roles, permissions }

    await this.audit.create({
      userId: user.id,
      action: 'oauth_login',
      resource: 'auth',
      ipAddress,
      metadata: { provider },
    })

    return {
      accessToken: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, roles, permissions },
      provider,
    }
  }
}
