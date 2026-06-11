import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { EmailVerificationService } from '../auth/email-verification.service'
import { EmailService } from '../email/email.service'
import { AuditService } from '../audit/audit.service'
import * as bcrypt from 'bcrypt'
import type { ContactFormDto, PublicRegisterDto } from './dto/public.dto'
import type { PublicStatsResponseDto } from './dto/public-stats.dto'

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verification: EmailVerificationService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: PublicRegisterDto, ipAddress?: string, userAgent?: string) {
    if (dto.website?.trim()) {
      throw new BadRequestException('Solicitud rechazada')
    }
    if (!dto.acceptTerms || !dto.acceptPrivacy) {
      throw new BadRequestException('Debes aceptar los términos y la política de privacidad')
    }

    const email = dto.email.trim().toLowerCase()
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Este email ya está registrado')
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const fullName = `${dto.firstName.trim()} ${dto.lastName.trim()}`.trim()
    const viewerRole = await this.prisma.role.findUnique({ where: { name: 'solo_lectura' } })

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.company.trim(),
        slug: `org-${cryptoRandomSlug()}`,
      },
    })

    const project = await this.prisma.project.create({
      data: {
        name: dto.company.trim(),
        slug: `ws-${cryptoRandomSlug()}`,
        organizationId: organization.id,
        description: 'Espacio de trabajo principal',
      },
    })

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: fullName,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        company: dto.company.trim(),
        marketingConsent: !!dto.marketingConsent,
        isActive: true,
        emailVerifiedAt: null,
        userRoles: viewerRole
          ? { create: [{ roleId: viewerRole.id, projectId: project.id }] }
          : undefined,
        memberships: {
          create: {
            organizationId: organization.id,
            role: 'OWNER',
          },
        },
      },
    })

    await this.verification.createAndSendVerification({
      userId: user.id,
      email: user.email,
      name: fullName,
      ipAddress,
      userAgent,
    })

    await this.audit.create({
      userId: user.id,
      action: 'register',
      resource: 'auth',
      ipAddress,
      metadata: { company: dto.company },
    })

    return {
      message: 'Revisa tu correo para validar la cuenta',
      email: user.email,
      expiresInHours: 24,
    }
  }

  verifyEmail(token: string, ipAddress?: string) {
    return this.verification.verifyToken(token, ipAddress)
  }

  resendVerification(email: string, ipAddress?: string, userAgent?: string) {
    return this.verification.resendVerification(email, ipAddress, userAgent)
  }

  async getStats(): Promise<PublicStatsResponseDto> {
    const baseWhere = { deletedAt: null as Date | null }
    const accountWhere = { deletedAt: null as Date | null, isActive: true }

    const [organizations, users, awsAccounts, gcpAccounts, azureAccounts, totalAccounts, activeInstances, totalInstances, dbHealthy] =
      await Promise.all([
        this.prisma.organization.count({ where: baseWhere }).catch(() => 0),
        this.prisma.user.count({ where: baseWhere }).catch(() => 0),
        this.prisma.cloudAccount.count({ where: { ...accountWhere, provider: 'AWS' } }).catch(() => 0),
        this.prisma.cloudAccount.count({ where: { ...accountWhere, provider: 'GCP' } }).catch(() => 0),
        this.prisma.cloudAccount.count({ where: { ...accountWhere, provider: 'AZURE' } }).catch(() => 0),
        this.prisma.cloudAccount.count({ where: accountWhere }).catch(() => 0),
        this.prisma.instance
          .count({ where: { deletedAt: null, status: 'RUNNING' } })
          .catch(() => 0),
        this.prisma.instance.count({ where: { deletedAt: null } }).catch(() => 0),
        this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      ])

    return {
      organizations,
      users,
      cloudAccounts: {
        aws: awsAccounts,
        gcp: gcpAccounts,
        azure: azureAccounts,
        total: totalAccounts,
      },
      activeInstances,
      totalInstances,
      uptimePercent: dbHealthy ? '99.9%' : '—',
      updatedAt: new Date().toISOString(),
    }
  }

  async submitContact(dto: ContactFormDto, ipAddress?: string) {
    if (dto.website?.trim()) {
      throw new BadRequestException('Solicitud rechazada')
    }

    await this.prisma.contactMessage.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        subject: dto.subject.trim(),
        reason: dto.reason,
        message: dto.message.trim(),
        ipAddress,
      },
    })

    if (this.email.isConfigured()) {
      await this.email.sendContactFormEmail({
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        reason: dto.reason,
        message: dto.message,
      })
    }

    return { message: 'Mensaje enviado correctamente. Te responderemos pronto.' }
  }
}

const cryptoRandomSlug = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
