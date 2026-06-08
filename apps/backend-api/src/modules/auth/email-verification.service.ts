import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { PrismaService } from '../../common/prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { AuditService } from '../audit/audit.service'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  private appUrl(): string {
    return this.config.get<string>('APP_URL', 'https://spendlyx.com').replace(/\/$/, '')
  }

  async createAndSendVerification(params: {
    userId: string
    email: string
    name: string
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: params.userId, usedAt: null },
      data: { usedAt: new Date() },
    })

    const rawToken = this.generateToken()
    const tokenHash = this.hashToken(rawToken)
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: params.userId,
        tokenHash,
        expiresAt,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })

    const verifyUrl = `${this.appUrl()}/verificar-email?token=${encodeURIComponent(rawToken)}`

    if (!this.email.isConfigured()) {
      throw new BadRequestException(
        'El servicio de correo no está configurado. Contacta con soporte en info@spendlyx.com',
      )
    }

    await this.email.sendVerificationEmail({
      to: params.email,
      name: params.name,
      verifyUrl,
    })
  }

  async verifyToken(rawToken: string, ipAddress?: string) {
    if (!rawToken?.trim()) {
      throw new BadRequestException('El enlace no es válido')
    }

    const tokenHash = this.hashToken(rawToken.trim())
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    })

    if (!record) {
      throw new BadRequestException('El enlace no es válido')
    }

    if (record.usedAt) {
      throw new BadRequestException('Este enlace ya ha sido utilizado')
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El enlace ha caducado')
    }

    if (!record.user || record.user.deletedAt) {
      throw new NotFoundException('Usuario no encontrado')
    }

    if (record.user.emailVerifiedAt) {
      return { alreadyVerified: true, email: record.user.email }
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date(), isActive: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    await this.audit.create({
      userId: record.userId,
      action: 'email_verified',
      resource: 'auth',
      ipAddress,
    })

    try {
      await this.email.sendWelcomeEmail({
        to: record.user.email,
        name: record.user.name ?? record.user.email,
        loginUrl: `${this.appUrl()}/login`,
      })
    } catch {
      /* bienvenida opcional */
    }

    return { verified: true, email: record.user.email }
  }

  async resendVerification(email: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase(), deletedAt: null },
    })

    if (!user) {
      return { sent: true, message: 'Si el correo existe, recibirás un nuevo enlace.' }
    }

    if (user.emailVerifiedAt) {
      throw new ConflictException('Esta cuenta ya está verificada')
    }

    await this.createAndSendVerification({
      userId: user.id,
      email: user.email,
      name: user.name ?? user.email,
      ipAddress,
      userAgent,
    })

    return { sent: true, message: 'Te hemos enviado un correo de validación' }
  }

  isEmailVerified(user: { emailVerifiedAt: Date | null }): boolean {
    return !!user.emailVerifiedAt
  }
}
